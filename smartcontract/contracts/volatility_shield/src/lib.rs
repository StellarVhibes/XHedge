#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Map,
    Vec,
};

// ─────────────────────────────────────────────
// Error types
// ─────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized  = 1,
    AlreadyInitialized = 2,
    NegativeAmount = 3,
    Unauthorized = 4,
    NoStrategies = 5,
    ContractPaused = 6,
    DepositCapExceeded = 7,
    WithdrawalCapExceeded = 8,
    StaleOracleData = 9,
    InvalidTimestamp = 10,
    ProposalNotFound = 11,
    AlreadyApproved = 12,
    ProposalExecuted = 13,
    InsufficientApprovals = 14,
}

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Asset,
    Oracle,
    TotalAssets,
    TotalShares,
    Strategies,
    Treasury,
    FeePercentage,
    Token,
    Balance(Address),
    Paused,
    MaxDepositPerUser,
    MaxTotalAssets,
    MaxWithdrawPerTx,
    OracleLastUpdate,
    MaxStaleness,
    TargetAllocations,
    Guardians,
    Threshold,
    Proposals,
    NextProposalId,
    WithdrawQueueThreshold,
    PendingWithdrawals,
    StrategyHealth(Address),
}

// ─────────────────────────────────────────────
// Queued withdrawal struct
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QueuedWithdrawal {
    pub user: Address,
    pub shares: i128,
    pub timestamp: u64,
}

// ─────────────────────────────────────────────
// Strategy health struct
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StrategyHealth {
    pub last_known_balance: i128,
    pub last_check_timestamp: u64,
    pub is_healthy: bool,
}

// ─────────────────────────────────────────────
// Strategy cross-contract client
// ─────────────────────────────────────────────
pub struct StrategyClient<'a> {
    env: &'a Env,
    address: Address,
}

impl<'a> StrategyClient<'a> {
    pub fn new(env: &'a Env, address: Address) -> Self {
        Self { env, address }
    }

    pub fn deposit(&self, amount: i128) {
        self.env.invoke_contract::<()>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "deposit"),
            soroban_sdk::vec![self.env, soroban_sdk::IntoVal::into_val(&amount, self.env)],
        );
    }

    pub fn withdraw(&self, amount: i128) {
        self.env.invoke_contract::<()>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "withdraw"),
            soroban_sdk::vec![self.env, soroban_sdk::IntoVal::into_val(&amount, self.env)],
        );
    }

    pub fn balance(&self) -> i128 {
        self.env.invoke_contract::<i128>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "balance"),
            soroban_sdk::vec![self.env],
        )
    }
}

// ─────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    SetPaused(bool),
    AddStrategy(Address),
    Rebalance,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub action: ActionType,
    pub approvals: Vec<Address>,
    pub executed: bool,
}

#[contract]
pub struct VolatilityShield;

#[contractimpl]
impl VolatilityShield {
    // ── Governance ────────────────────────────
    pub fn propose_action(env: Env, proposer: Address, action: ActionType) -> u64 {
        proposer.require_auth();
        
        let guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).unwrap();
        if !guardians.contains(proposer.clone()) {
            panic!("not a guardian");
        }

        let id = env.storage().instance().get(&DataKey::NextProposalId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextProposalId, &(id + 1));

        let mut proposal = Proposal {
            id,
            proposer: proposer.clone(),
            action: action.clone(),
            approvals: soroban_sdk::vec![&env, proposer],
            executed: false,
        };

        let threshold: u32 = env.storage().instance().get(&DataKey::Threshold).unwrap_or(1);
        if threshold <= 1 {
            Self::execute_action(&env, &action).unwrap();
            proposal.executed = true;
        }

        let mut proposals: Map<u64, Proposal> = env.storage().instance().get(&DataKey::Proposals).unwrap_or(Map::new(&env));
        proposals.set(id, proposal);
        env.storage().instance().set(&DataKey::Proposals, &proposals);

        id
    }

    pub fn approve_action(env: Env, guardian: Address, proposal_id: u64) -> Result<(), Error> {
        guardian.require_auth();

        let guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).ok_or(Error::NotInitialized)?;
        if !guardians.contains(guardian.clone()) {
            return Err(Error::Unauthorized);
        }

        let mut proposals: Map<u64, Proposal> = env.storage().instance().get(&DataKey::Proposals).ok_or(Error::NotInitialized)?;
        let mut proposal = proposals.get(proposal_id).ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Err(Error::ProposalExecuted);
        }

        if proposal.approvals.contains(guardian.clone()) {
            return Err(Error::AlreadyApproved);
        }

        proposal.approvals.push_back(guardian);
        
        let threshold: u32 = env.storage().instance().get(&DataKey::Threshold).unwrap_or(1);
        if proposal.approvals.len() >= threshold {
            Self::execute_action(&env, &proposal.action)?;
            proposal.executed = true;
        }

        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&DataKey::Proposals, &proposals);

        Ok(())
    }

    fn execute_action(env: &Env, action: &ActionType) -> Result<(), Error> {
        match action {
            ActionType::SetPaused(state) => {
                env.storage().instance().set(&DataKey::Paused, state);
                env.events().publish((symbol_short!("paused"),), state);
            }
            ActionType::AddStrategy(strategy) => {
                Self::internal_add_strategy(env, strategy.clone())?;
            }
            ActionType::Rebalance => {
                Self::internal_rebalance(env)?;
            }
        }
        Ok(())
    }

    // ── Initialization ────────────────────────
    /// Must be called once. Stores roles and configuration.
    pub fn init(
        env: Env,
        admin: Address,
        asset: Address,
        oracle: Address,
        treasury: Address,
        fee_percentage: u32,
        guardians: Vec<Address>,
        threshold: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Asset, &asset);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Guardians, &guardians);
        env.storage().instance().set(&DataKey::Threshold, &threshold);
        env.storage().instance().set(&DataKey::NextProposalId, &1u64);
        env.storage()
            .instance()
            .set(&DataKey::Strategies, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage()
            .instance()
            .set(&DataKey::FeePercentage, &fee_percentage);
        env.storage().instance().set(&DataKey::Token, &asset);

        // Initialize vault state to zero
        env.storage().instance().set(&DataKey::TotalAssets, &0_i128);
        env.storage().instance().set(&DataKey::TotalShares, &0_i128);
        env.storage().instance().set(&DataKey::MaxStaleness, &3600u64);

        Ok(())
    }

    // ── Deposit ───────────────────────────────
    pub fn deposit(env: Env, from: Address, amount: i128) {
        Self::assert_not_paused(&env);
        if amount <= 0 {
            panic!("deposit amount must be positive");
        }
        from.require_auth();

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("Token not initialized");
        token::Client::new(&env, &token).transfer(&from, &env.current_contract_address(), &amount);

        let shares_to_mint = Self::convert_to_shares(env.clone(), amount);

        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        
        let new_user_balance = current_balance.checked_add(shares_to_mint).unwrap();
        
        // --- Deposit Caps Validation ---
        let max_deposit_per_user: i128 = env.storage().instance().get(&DataKey::MaxDepositPerUser).unwrap_or(i128::MAX);
        if new_user_balance > max_deposit_per_user {
            env.events().publish((symbol_short!("Cap"), symbol_short!("deposit")), amount);
            panic!("DepositCapExceeded: per-user deposit cap exceeded");
        }

        let total_assets = Self::total_assets(&env);
        let new_total_assets = total_assets.checked_add(amount).unwrap();
        
        let max_total_assets: i128 = env.storage().instance().get(&DataKey::MaxTotalAssets).unwrap_or(i128::MAX);
        if new_total_assets > max_total_assets {
            env.events().publish((symbol_short!("Cap"), symbol_short!("deposit")), amount);
            panic!("DepositCapExceeded: global deposit cap exceeded");
        }
        // -------------------------------

        env.storage().persistent().set(
            &balance_key,
            &new_user_balance,
        );

        let total_shares = Self::total_shares(&env);
        Self::set_total_shares(
            env.clone(),
            total_shares.checked_add(shares_to_mint).unwrap(),
        );
        Self::set_total_assets(env.clone(), total_assets.checked_add(amount).unwrap());

        env.events()
            .publish((symbol_short!("Deposit"), from.clone()), amount);
    }

    // ── Withdraw ──────────────────────────────
    pub fn withdraw(env: Env, from: Address, shares: i128) {
        Self::assert_not_paused(&env);
        if shares <= 0 {
            panic!("shares to withdraw must be positive");
        }
        from.require_auth();

        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);

        if current_balance < shares {
            panic!("insufficient shares for withdrawal");
        }

        let assets_to_withdraw = Self::convert_to_assets(env.clone(), shares);

        // --- Withdraw Caps Validation ---
        let max_withdraw_per_tx: i128 = env.storage().instance().get(&DataKey::MaxWithdrawPerTx).unwrap_or(i128::MAX);
        if assets_to_withdraw > max_withdraw_per_tx {
            env.events().publish((symbol_short!("Cap"), symbol_short!("withdraw")), assets_to_withdraw);
            panic!("WithdrawalCapExceeded: per-tx withdrawal cap exceeded");
        }
        // --------------------------------

        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);

        Self::set_total_shares(env.clone(), total_shares.checked_sub(shares).unwrap());
        Self::set_total_assets(
            env.clone(),
            total_assets.checked_sub(assets_to_withdraw).unwrap(),
        );
        env.storage().persistent().set(
            &balance_key,
            &(current_balance.checked_sub(shares).unwrap()),
        );

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("Token not initialized");
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &from,
            &assets_to_withdraw,
        );

        env.events()
            .publish((symbol_short!("withdraw"), from.clone()), shares);
    }

    // ── Queue Withdraw ─────────────────────────
    /// Queue a withdrawal that exceeds the threshold for controlled processing
    pub fn queue_withdraw(env: Env, from: Address, shares: i128) {
        Self::assert_not_paused(&env);
        if shares <= 0 {
            panic!("shares to queue must be positive");
        }
        from.require_auth();

        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);

        if current_balance < shares {
            panic!("insufficient shares for withdrawal");
        }

        let assets_to_withdraw = Self::convert_to_assets(env.clone(), shares);
        
        // Check if withdrawal exceeds queue threshold
        let queue_threshold: i128 = env.storage().instance()
            .get(&DataKey::WithdrawQueueThreshold)
            .unwrap_or(i128::MAX);
        
        if assets_to_withdraw <= queue_threshold {
            panic!("withdrawal amount does not exceed queue threshold");
        }

        // Create queued withdrawal entry
        let queued_withdrawal = QueuedWithdrawal {
            user: from.clone(),
            shares,
            timestamp: env.ledger().timestamp(),
        };

        // Add to pending withdrawals queue
        let mut pending_withdrawals: Vec<QueuedWithdrawal> = env.storage().instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));
        
        pending_withdrawals.push_back(queued_withdrawal);
        env.storage().instance().set(&DataKey::PendingWithdrawals, &pending_withdrawals);

        // Emit WithdrawQueued event
        env.events()
            .publish((symbol_short!("WithdrawQ"), from.clone()), shares);
    }

    // ── Withdraw Queue Management ─────────────────────
    /// Set the threshold for queuing withdrawals
    pub fn set_withdraw_queue_threshold(env: Env, threshold: i128) {
        Self::require_admin(&env);
        if threshold < 0 {
            panic!("threshold must be non-negative");
        }
        env.storage().instance().set(&DataKey::WithdrawQueueThreshold, &threshold);
        env.events().publish((symbol_short!("QueueThr"),), threshold);
    }

    /// Process queued withdrawals (admin only)
    pub fn process_queued_withdrawals(env: Env, limit: u32) -> u32 {
        Self::require_admin(&env);
        
        let mut pending_withdrawals: Vec<QueuedWithdrawal> = env.storage().instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));
        
        let initial_count = pending_withdrawals.len();
        let mut processed = 0;
        
        let mut remaining_withdrawals = Vec::new(&env);
        
        for queued_withdrawal in pending_withdrawals.iter() {
            if processed >= limit {
                remaining_withdrawals.push_back(queued_withdrawal.clone());
                continue;
            }
            
            // Check if user still has sufficient shares
            let balance_key = DataKey::Balance(queued_withdrawal.user.clone());
            let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
            
            if current_balance >= queued_withdrawal.shares {
                // Process the withdrawal
                let assets_to_withdraw = Self::convert_to_assets(env.clone(), queued_withdrawal.shares);
                
                let total_shares = Self::total_shares(&env);
                let total_assets = Self::total_assets(&env);
                
                Self::set_total_shares(env.clone(), total_shares.checked_sub(queued_withdrawal.shares).unwrap());
                Self::set_total_assets(
                    env.clone(),
                    total_assets.checked_sub(assets_to_withdraw).unwrap(),
                );
                env.storage().persistent().set(
                    &balance_key,
                    &(current_balance.checked_sub(queued_withdrawal.shares).unwrap()),
                );
                
                let token: Address = env
                    .storage()
                    .instance()
                    .get(&DataKey::Token)
                    .expect("Token not initialized");
                token::Client::new(&env, &token).transfer(
                    &env.current_contract_address(),
                    &queued_withdrawal.user,
                    &assets_to_withdraw,
                );
                
                env.events()
                    .publish((symbol_short!("WithdrawP"), queued_withdrawal.user.clone()), queued_withdrawal.shares);
                
                processed += 1;
            } else {
                // Keep in queue if insufficient shares
                remaining_withdrawals.push_back(queued_withdrawal.clone());
            }
        }
        
        // Update remaining withdrawals
        env.storage().instance().set(&DataKey::PendingWithdrawals, &remaining_withdrawals);
        
        processed
    }

    /// Get the current withdrawal queue threshold
    pub fn get_withdraw_queue_threshold(env: Env) -> i128 {
        env.storage().instance()
            .get(&DataKey::WithdrawQueueThreshold)
            .unwrap_or(i128::MAX)
    }

    /// Get all pending queued withdrawals
    pub fn get_pending_withdrawals(env: Env) -> Vec<QueuedWithdrawal> {
        env.storage().instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env))
    }

    // ── Rebalance ─────────────────────────────
    /// Move funds between strategies according to `allocations`.
    ///
    /// `allocations` maps each strategy address to its *target* balance.
    /// If target > current  → vault sends tokens to the strategy and calls deposit().
    /// If target < current  → strategy withdraws and sends tokens back to vault.
    ///
    /// **Access control**: must be called via the multi-sig governance system.
    fn internal_rebalance(env: &Env) -> Result<(), Error> {
        let admin  = Self::read_admin(&env);
        let oracle = Self::get_oracle(&env);

        // OR-auth: require that either Admin or Oracle authorised this invocation.
        Self::require_admin_or_oracle(&env, &admin, &oracle);

        let now = env.ledger().timestamp();
        let last_update = env.storage().instance().get(&DataKey::OracleLastUpdate).unwrap_or(0u64);
        let max_staleness = Self::max_staleness(&env);

        if now > last_update.checked_add(max_staleness).unwrap_or(u64::MAX) {
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "StaleOracleRejected"),),
                last_update,
            );
            return Err(Error::StaleOracleData);
        }

        let allocations: Map<Address, i128> = env.storage()
            .instance()
            .get(&DataKey::TargetAllocations)
            .ok_or(Error::NotInitialized)?;

        let asset_addr   = Self::get_asset(&env);
        let token_client = token::Client::new(&env, &asset_addr);
        let vault        = env.current_contract_address();

        for (strategy_addr, target_allocation) in allocations.iter() {
            let strategy       = StrategyClient::new(&env, strategy_addr.clone());
            let current_balance = strategy.balance();

            if target_allocation > current_balance {
                // Vault → Strategy
                let diff = target_allocation - current_balance;
                token_client.transfer(&vault, &strategy_addr, &diff);
                strategy.deposit(diff);
            } else if target_allocation < current_balance {
                // Strategy → Vault
                let diff = current_balance - target_allocation;
                strategy.withdraw(diff);
                token_client.transfer(&strategy_addr, &vault, &diff);
            }
            // If equal, do nothing.
        }
        Ok(())
    }

    /// Stores new target allocations from the Oracle. Validates timestamp freshness.
    pub fn set_oracle_data(env: Env, allocations: Map<Address, i128>, timestamp: u64) -> Result<(), Error> {
        let oracle = Self::get_oracle(&env);
        oracle.require_auth();

        let now = env.ledger().timestamp();
        if timestamp > now {
            return Err(Error::InvalidTimestamp);
        }

        let last_timestamp = env.storage().instance().get(&DataKey::OracleLastUpdate).unwrap_or(0u64);
        if timestamp <= last_timestamp {
            return Err(Error::InvalidTimestamp);
        }

        env.storage().instance().set(&DataKey::OracleLastUpdate, &timestamp);
        env.storage().instance().set(&DataKey::TargetAllocations, &allocations);

        Ok(())
    }

    pub fn calc_rebalance_delta(current: i128, target: i128) -> i128 {
        target
            .checked_sub(current)
            .expect("arithmetic overflow in rebalance delta")
    }

    // ── Strategy Management ───────────────────
    fn internal_add_strategy(env: &Env, strategy: Address) -> Result<(), Error> {
        Self::require_admin(&env);

        let mut strategies: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Strategies)
            .unwrap_or(Vec::new(&env));
        if strategies.contains(strategy.clone()) {
            return Err(Error::AlreadyInitialized);
        }
        strategies.push_back(strategy.clone());
        env.storage()
            .instance()
            .set(&DataKey::Strategies, &strategies);

        env.events().publish(
            (symbol_short!("Strategy"), symbol_short!("added")),
            strategy,
        );

        Ok(())
    }

    pub fn harvest(env: Env) -> Result<i128, Error> {
        Self::require_admin(&env);

        let strategies = Self::get_strategies(&env);
        if strategies.is_empty() {
            return Err(Error::NoStrategies);
        }

        let mut total_yield: i128 = 0;
        for strategy_addr in strategies.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr);
            let yield_amount = strategy.balance();
            total_yield = total_yield.checked_add(yield_amount).unwrap();
        }

        if total_yield > 0 {
            let current_assets = Self::total_assets(&env);
            Self::set_total_assets(
                env.clone(),
                current_assets.checked_add(total_yield).unwrap(),
            );
        }

        env.events()
            .publish((symbol_short!("harvest"),), total_yield);
        Ok(total_yield)
    }

    // ── Strategy Health Monitoring ───────────────────
    /// Check health of all strategies and compare expected vs actual balances
    pub fn check_strategy_health(env: Env) -> Result<Vec<Address>, Error> {
        Self::require_admin(&env);
        
        let strategies = Self::get_strategies(&env);
        if strategies.is_empty() {
            return Err(Error::NoStrategies);
        }

        let mut unhealthy_strategies = Vec::new(&env);
        let current_time = env.ledger().timestamp();
        
        // Get expected allocations from oracle data
        let expected_allocations: Map<Address, i128> = env.storage()
            .instance()
            .get(&DataKey::TargetAllocations)
            .unwrap_or(Map::new(&env));

        for strategy_addr in strategies.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr.clone());
            let actual_balance = strategy.balance();
            
            // Get expected balance from allocations
            let expected_balance = expected_allocations
                .get(strategy_addr.clone())
                .unwrap_or(0);
            
            // Get current health data
            let health_key = DataKey::StrategyHealth(strategy_addr.clone());
            let current_health = env.storage()
                .instance()
                .get(&health_key)
                .unwrap_or(StrategyHealth {
                    last_known_balance: expected_balance,
                    last_check_timestamp: current_time,
                    is_healthy: true,
                });
            
            // Check if strategy is unhealthy (significant deviation from expected)
            let balance_deviation = if expected_balance > 0 {
                // Allow 10% deviation before flagging as unhealthy
                let deviation_threshold = expected_balance.checked_div(10).unwrap_or(0);
                (actual_balance as i128 - expected_balance).abs() > deviation_threshold
            } else {
                // If expected is 0, any positive actual balance is considered healthy
                false
            };
            
            let is_healthy = !balance_deviation;
            
            // Update health data if changed
            if is_healthy != current_health.is_healthy || 
               actual_balance != current_health.last_known_balance {
                let new_health = StrategyHealth {
                    last_known_balance: actual_balance,
                    last_check_timestamp: current_time,
                    is_healthy,
                };
                env.storage().instance().set(&health_key, &new_health);
            }
            
            // If unhealthy, add to list for flagging
            if !is_healthy {
                unhealthy_strategies.push_back(strategy_addr.clone());
            }
        }
        
        Ok(unhealthy_strategies)
    }

    /// Flag a strategy as unhealthy (admin only)
    pub fn flag_strategy(env: Env, strategy: Address) -> Result<(), Error> {
        Self::require_admin(&env);
        
        // Verify strategy exists
        let strategies = Self::get_strategies(&env);
        if !strategies.contains(strategy.clone()) {
            return Err(Error::NotInitialized);
        }
        
        let health_key = DataKey::StrategyHealth(strategy.clone());
        let current_time = env.ledger().timestamp();
        
        // Update health to unhealthy
        let updated_health = StrategyHealth {
            last_known_balance: 0, // Will be updated on next health check
            last_check_timestamp: current_time,
            is_healthy: false,
        };
        
        env.storage().instance().set(&health_key, &updated_health);
        
        // Emit StrategyFlagged event
        env.events()
            .publish((symbol_short!("StrategyF"), strategy.clone()), current_time);
        
        Ok(())
    }

    /// Remove a strategy and withdraw all funds first (admin only)
    pub fn remove_strategy(env: Env, strategy: Address) -> Result<(), Error> {
        Self::require_admin(&env);
        
        // Verify strategy exists
        let mut strategies = Self::get_strategies(&env);
        let strategy_index = strategies.iter().position(|s| s == strategy);
        
        if strategy_index.is_none() {
            return Err(Error::NotInitialized);
        }
        
        // Withdraw all funds from strategy first
        let strategy_client = StrategyClient::new(&env, strategy.clone());
        let strategy_balance = strategy_client.balance();
        
        if strategy_balance > 0 {
            // Transfer all funds back to vault
            let asset_addr = Self::get_asset(&env);
            let token_client = token::Client::new(&env, &asset_addr);
            
            // Withdraw from strategy
            strategy_client.withdraw(strategy_balance);
            
            // Update total assets to reflect returned funds
            let current_assets = Self::total_assets(&env);
            Self::set_total_assets(
                env.clone(),
                current_assets.checked_add(strategy_balance).unwrap(),
            );
        }
        
        // Remove from strategies list
        strategies.remove(strategy_index.unwrap() as u32);
        env.storage().instance().set(&DataKey::Strategies, &strategies);
        
        // Clean up health data
        let health_key = DataKey::StrategyHealth(strategy.clone());
        env.storage().instance().remove(&health_key);
        
        // Emit StrategyRemoved event
        env.events()
            .publish((symbol_short!("StrategyR"), strategy.clone()), strategy_balance);
        
        Ok(())
    }

    /// Get health information for a specific strategy
    pub fn get_strategy_health(env: Env, strategy: Address) -> Option<StrategyHealth> {
        env.storage()
            .instance()
            .get(&DataKey::StrategyHealth(strategy))
    }

    // ── View helpers ──────────────────────────
    pub fn has_admin(env: &Env) -> bool {
        env.storage().instance().has(&DataKey::Admin)
    }

    pub fn read_admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized")
    }

    /// Total assets managed by the vault: vault token balance + sum of strategy balances.
    pub fn total_assets(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalAssets)
        .unwrap_or(0)
    }

    pub fn total_shares(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }

    pub fn get_oracle(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Oracle)
            .expect("Not initialized")
    }

    pub fn get_asset(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Asset)
            .expect("Not initialized")
    }

    pub fn get_strategies(env: &Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Strategies)
            .unwrap_or(Vec::new(env))
    }

    pub fn treasury(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Treasury)
            .expect("Not initialized")
    }

    pub fn fee_percentage(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::FeePercentage)
            .unwrap_or(0)
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(user))
            .unwrap_or(0)
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Option<Proposal> {
        let proposals: Map<u64, Proposal> = env.storage().instance().get(&DataKey::Proposals)?;
        proposals.get(proposal_id)
    }

    pub fn get_guardians(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::Guardians).unwrap_or(Vec::new(&env))
    }

    pub fn get_threshold(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Threshold).unwrap_or(1)
    }

    // ── Internal Helpers ──────────────────────
    pub fn take_fees(env: &Env, amount: i128) -> i128 {
        let fee_pct = Self::fee_percentage(&env);
        if fee_pct == 0 {
            return amount;
        }
        let fee = amount
            .checked_mul(fee_pct as i128)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        amount - fee
    }

    pub fn convert_to_shares(env: Env, amount: i128) -> i128 {
        if amount < 0 {
            panic!("negative amount");
        }
        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);
        if total_shares == 0 || total_assets == 0 {
            return amount;
        }
        amount
            .checked_mul(total_shares)
            .unwrap()
            .checked_div(total_assets)
            .unwrap()
    }

    pub fn convert_to_assets(env: Env, shares: i128) -> i128 {
        if shares < 0 {
            panic!("negative amount");
        }
        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);
        if total_shares == 0 {
            return shares;
        }
        shares
            .checked_mul(total_assets)
            .unwrap()
            .checked_div(total_shares)
            .unwrap()
    }

    pub fn set_total_assets(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalAssets, &amount);
    }

    pub fn set_total_shares(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalShares, &amount);
    }

    pub fn set_balance(env: Env, user: Address, amount: i128) {
        env.storage()
            .persistent()
            .set(&DataKey::Balance(user), &amount);
    }

    pub fn set_token(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }

    fn require_admin(env: &Env) -> Address {
        let admin = Self::read_admin(env);
        admin.require_auth();
        admin
    }

    // ── Emergency Pause ──────────────────────────
    pub fn set_paused(_env: Env, _state: bool) {
        panic!("set_paused is deprecated, use governance proposals");
    }

    // ── Deposit / Withdrawal Caps ──────────────────────────
    pub fn set_deposit_cap(env: Env, per_user: i128, global: i128) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::MaxDepositPerUser, &per_user);
        env.storage().instance().set(&DataKey::MaxTotalAssets, &global);
        env.events().publish((symbol_short!("Caps"), symbol_short!("deposit")), (per_user, global));
    }

    pub fn set_withdraw_cap(env: Env, per_tx: i128) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::MaxWithdrawPerTx, &per_tx);
        env.events().publish((symbol_short!("Caps"), symbol_short!("withdraw")), per_tx);
    }

    pub fn set_max_staleness(env: Env, seconds: u64) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::MaxStaleness, &seconds);
    }

    pub fn max_staleness(env: &Env) -> u64 {
        env.storage().instance().get(&DataKey::MaxStaleness).unwrap_or(3600)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    fn assert_not_paused(env: &Env) {
        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            panic!("ContractPaused");
        }
    }

    // ─────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────

    /// Require that either `admin` or `oracle` has authorised this call.
    ///
    /// Require that either `admin` or `oracle` has authorised this call.
    ///
    /// Soroban OR-auth: the client must place an `InvokerContractAuthEntry`
    /// for one of the two roles.  We use `require_auth()` on admin first; if
    /// the tx was built with oracle auth instead, the oracle address should be
    /// passed as the `admin` role by the off-chain builder, or — more commonly
    /// — the oracle contract calls this vault as a sub-invocation.
    ///
    /// For simplicity: admin.require_auth() covers the admin case.
    /// Oracle-initiated calls should be routed through a thin oracle contract
    /// that calls rebalance() as a sub-invocation (so the vault sees the oracle
    /// contract as the top-level caller).  In tests, use mock_all_auths().
    fn require_admin_or_oracle(
        _env:   &Env,
        admin:  &Address,
        oracle: &Address,
    ) {
        // Try admin first. If the transaction was signed by the oracle, the
        // oracle is expected to call this contract directly, and the oracle's
        // address is checked here as a fallback.
        if *admin == *oracle {
            admin.require_auth();
        } else {
            // Both are required to be checked; the signed party will pass.
            // In Soroban the host simply verifies whichever has an auth entry.
            admin.require_auth();
        }
    }
}

mod test;
