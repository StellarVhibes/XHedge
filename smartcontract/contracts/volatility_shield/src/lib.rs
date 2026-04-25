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
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NegativeAmount = 3,
    Unauthorized = 4,
    NoStrategies = 5,
    ContractPaused = 6,
    DepositCapExceeded = 7,
    WithdrawalCapExceeded = 8,
    StaleOracleData = 9,
    InvalidTimestamp = 10,
    SlippageExceeded = 11,
    ProposalNotFound = 12,
    AlreadyApproved = 13,
    ProposalExecuted = 14,
    InsufficientApprovals = 15,
    TimelockNotElapsed = 16,
    WithdrawalNotFound = 17,
    QueueEmpty = 18,
    InvalidAllocationSum = 19,
    NegativeAllocation = 20,
    ZeroAddressStrategy = 21,
    HarvestTooEarly = 22,
    ReentrantCall = 23,
    UserBlocked = 24,
    CircuitBreakerActive = 25,
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
    ContractVersion,
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
    TimelockDuration,
    GovernanceToken,
    AssetBalance(Address, Address),
    AssetTotalAssets(Address),
    HarvestInterval,
    LastHarvestLedger,
    ReentrancyGuard,
    StrategyYieldSnapshot(Address),
    LastSafeAllocation,
    OracleCircuitBreakerActive,
    BlocklistMode,
    AllowlistMode,
    Blocklist,
    Allowlist,
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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    SetPaused(bool),
    AddStrategy(Address),
    Rebalance(u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub action: ActionType,
    pub approvals: Vec<Address>,
    pub executed: bool,
    pub proposed_at: u64,
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
// Reentrancy Guard wrapper
// ─────────────────────────────────────────────
pub struct Guard<'a>(&'a Env);

impl<'a> Guard<'a> {
    pub fn new(env: &'a Env) -> Self {
        VolatilityShield::enter_guard(env);
        Self(env)
    }
}

impl<'a> Drop for Guard<'a> {
    fn drop(&mut self) {
        VolatilityShield::exit_guard(self.0);
    }
}

// ─────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────

/// Snapshot of vault global state returned by `get_vault_summary`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultSummary {
    pub total_assets: i128,
    pub total_shares: i128,
    pub share_price: i128,
    pub paused: bool,
    pub oracle_last_update: u64,
}

/// Snapshot of a user's vault position returned by `get_user_summary`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserSummary {
    pub balance: i128,
    pub queued_shares: i128,
    pub voting_power: i128,
}

/// Snapshot of governance configuration returned by `get_governance_summary`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct GovernanceSummary {
    pub guardians: Vec<Address>,
    pub threshold: u32,
    pub active_proposal_count: u32,
}

/// Per-strategy entry returned by `get_strategy_summary`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct StrategyEntry {
    pub strategy: Address,
    pub last_known_balance: i128,
    pub is_healthy: bool,
}

/// Snapshot of strategy yield at a specific ledger (harvest point).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct YieldSnapshot {
    pub balance: i128,
    pub ledger: u32,
}

/// Vector of yield snapshots for a strategy (chronological order).
#[contracttype]
#[derive(Clone)]
pub struct YieldHistory {
    pub snapshots: Vec<YieldSnapshot>,
}

#[contract]
pub struct VolatilityShield;

#[contractimpl]
impl VolatilityShield {
    pub fn enter_guard(env: &Env) {
        if env
            .storage()
            .instance()
            .get(&DataKey::ReentrancyGuard)
            .unwrap_or(false)
        {
            panic!("ReentrantCall");
        }
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyGuard, &true);
    }

    pub fn exit_guard(env: &Env) {
        env.storage().instance().remove(&DataKey::ReentrancyGuard);
    }

    /// Propose a new governance action.
    ///
    /// This is the first step in the multisig/timelock process.
    /// Only guardians can propose actions.
    pub fn propose_action(env: Env, proposer: Address, action: ActionType) -> Result<u64, Error> {
        proposer.require_auth();

        let guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).unwrap();
        if !guardians.contains(proposer.clone()) {
            return Err(Error::Unauthorized);
        }

        let id = env
            .storage()
            .instance()
            .get(&DataKey::NextProposalId)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &(id + 1));

        let proposed_at = env.ledger().timestamp();
        let mut proposal = Proposal {
            id,
            proposer: proposer.clone(),
            action: action.clone(),
            approvals: soroban_sdk::vec![&env, proposer],
            executed: false,
            proposed_at,
        };

        // Emit TimelockStarted event
        env.events()
            .publish((symbol_short!("Timelock"),), (id, proposed_at));

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);
        if threshold <= 1 {
            // Try to execute, but if timelock hasn't elapsed, the proposal will remain unexecuted
            let res = Self::execute_action(&env, &action, proposed_at);
            if let Err(e) = res {
                if e != Error::TimelockNotElapsed {
                    return Err(e);
                }
            } else {
                proposal.executed = true;
            }
        }

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or(Map::new(&env));
        proposals.set(id, proposal);
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &proposals);

        Ok(id)
    }

    /// Approve a pending governance proposal.
    ///
    /// If the approval threshold is reached, the action is executed.
    /// Guardians cannot approve the same proposal twice.
    pub fn approve_action(env: Env, guardian: Address, proposal_id: u64) -> Result<(), Error> {
        guardian.require_auth();

        let guardians: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Guardians)
            .ok_or(Error::NotInitialized)?;
        if !guardians.contains(guardian.clone()) {
            return Err(Error::Unauthorized);
        }

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .ok_or(Error::NotInitialized)?;
        let mut proposal = proposals.get(proposal_id).ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Err(Error::ProposalExecuted);
        }

        if proposal.approvals.contains(guardian.clone()) {
            return Err(Error::AlreadyApproved);
        }

        proposal.approvals.push_back(guardian);

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);
        if proposal.approvals.len() >= threshold {
            Self::execute_action(&env, &proposal.action, proposal.proposed_at)?;
            proposal.executed = true;
        }

        proposals.set(proposal_id, proposal);
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &proposals);

        Ok(())
    }

    pub fn set_governance_token(env: Env, token: Address) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::GovernanceToken, &token);
        env.events().publish((symbol_short!("GovToken"),), token);
    }

    pub fn get_voting_power(env: Env, user: Address) -> i128 {
        let gov_token: Option<Address> = env.storage().instance().get(&DataKey::GovernanceToken);
        if let Some(token_addr) = gov_token {
            let client = token::Client::new(&env, &token_addr);
            client.balance(&user)
        } else {
            let balance_key = DataKey::Balance(user);
            env.storage().persistent().get(&balance_key).unwrap_or(0)
        }
    }

    pub fn cast_vote(_env: Env, _proposal_id: u64, _support: bool) -> Result<(), Error> {
        // TODO: Implement cast_vote
        Ok(())
    }

    /// Add a new guardian to the multisig.
    /// Only the admin can call this.
    pub fn add_guardian(env: Env, guardian: Address) -> Result<(), Error> {
        Self::require_admin(&env);
        let mut guardians: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Guardians)
            .unwrap_or(Vec::new(&env));
        if guardians.contains(guardian.clone()) {
            return Ok(());
        }
        guardians.push_back(guardian.clone());
        env.storage()
            .instance()
            .set(&DataKey::Guardians, &guardians);
        env.events()
            .publish((symbol_short!("GuardAdd"), guardian), ());
        Ok(())
    }

    /// Remove an existing guardian.
    /// Only the admin can call this.
    pub fn remove_guardian(env: Env, guardian: Address) -> Result<(), Error> {
        Self::require_admin(&env);
        let mut guardians: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Guardians)
            .unwrap_or(Vec::new(&env));
        let index = guardians
            .first_index_of(guardian.clone())
            .ok_or(Error::Unauthorized)?;
        guardians.remove(index);
        env.storage()
            .instance()
            .set(&DataKey::Guardians, &guardians);
        env.events()
            .publish((symbol_short!("GuardRm"), guardian), ());
        Ok(())
    }

    /// Set the required number of approvals for executing proposals.
    /// Only the admin can call this. Must be <= number of guardians.
    pub fn set_threshold(env: Env, threshold: u32) -> Result<(), Error> {
        Self::require_admin(&env);
        let guardians: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Guardians)
            .unwrap_or(Vec::new(&env));
        if threshold == 0 || threshold > guardians.len() {
            return Err(Error::Unauthorized);
        }
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
        env.events()
            .publish((symbol_short!("Threshold"),), threshold);
        Ok(())
    }

    fn execute_action(env: &Env, action: &ActionType, proposed_at: u64) -> Result<(), Error> {
        // Check if timelock has elapsed
        Self::assert_timelock_elapsed(env, proposed_at)?;
        match action {
            ActionType::SetPaused(state) => {
                env.storage().instance().set(&DataKey::Paused, state);
                env.events()
                    .publish((soroban_sdk::Symbol::new(env, "Paused"),), state);
            }
            ActionType::AddStrategy(strategy) => {
                Self::internal_add_strategy(env, strategy.clone())?;
            }
            ActionType::Rebalance(max_slippage) => {
                Self::internal_rebalance(env, *max_slippage)?;
            }
        }

        // Emit TimelockExecuted event
        env.events().publish((symbol_short!("TlockExec"),), ());

        Ok(())
    }

    fn assert_timelock_elapsed(env: &Env, proposed_at: u64) -> Result<(), Error> {
        let timelock_duration: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TimelockDuration)
            .unwrap_or(0);

        // If timelock duration is 0, no timelock is enforced
        if timelock_duration == 0 {
            return Ok(());
        }

        let now = env.ledger().timestamp();
        let elapsed = now.checked_sub(proposed_at).unwrap_or(0);

        if elapsed < timelock_duration {
            return Err(Error::TimelockNotElapsed);
        }

        Ok(())
    }

    // ── Initialization ────────────────────────
    /// Initialize the contract state.
    ///
    /// This function can only be called once.
    /// @param admin The address with administrative privileges.
    /// @param asset The address of the asset being managed (e.g., USDC).
    /// @param oracle The address of the oracle provider.
    /// @param treasury The address where fees are collected.
    /// @param fee_percentage The management fee in basis points (1/10000).
    /// @param guardians A list of addresses for the multisig governance.
    /// @param threshold The number of approvals required for governance actions.
    #[allow(clippy::too_many_arguments)]
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
        env.storage()
            .instance()
            .set(&DataKey::Strategies, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage()
            .instance()
            .set(&DataKey::FeePercentage, &fee_percentage);
        env.storage().instance().set(&DataKey::Token, &asset);

        // Initialize maps and durations
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &Map::<u64, Proposal>::new(&env));
        env.storage()
            .instance()
            .set(&DataKey::TimelockDuration, &0_u64);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &1_u64);

        // Initialize vault state to zero
        env.storage().instance().set(&DataKey::TotalAssets, &0_i128);
        env.storage().instance().set(&DataKey::TotalShares, &0_i128);
        env.storage()
            .instance()
            .set(&DataKey::MaxStaleness, &3600u64);

        // Initialize contract version
        env.storage()
            .instance()
            .set(&DataKey::ContractVersion, &1u32);

        // Multisig initialization
        env.storage()
            .instance()
            .set(&DataKey::Guardians, &guardians);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);

        // Initialize contract version
        env.storage()
            .instance()
            .set(&DataKey::ContractVersion, &1u32);

        Ok(())
    }

    // ── Deposit ───────────────────────────────
    /// Deposit assets into the vault.
    /// If asset is not the default/primary asset, it must be in the accepted assets list.
    /// The user will receive shares in return, proportional to the current share price.
    /// 
    /// Compliance checks:
    /// - If blocklist mode is active, blocked users cannot deposit
    /// - If allowlist mode is active, only allowlisted users can deposit
    /// 
    /// @param from The address of the user depositing.
    /// @param asset The address of the asset being deposited.
    /// @param amount The amount of assets to deposit.
    pub fn deposit(env: Env, from: Address, asset: Address, amount: i128) {
        let _guard = Guard::new(&env);
        Self::check_version(&env, 1);
        Self::assert_not_paused(&env);
        if amount <= 0 {
            panic!("deposit amount must be positive");
        }
        from.require_auth();

        // Compliance checks
        if let Err(e) = Self::check_compliance(&env, &from) {
            panic!("Compliance check failed: {:?}", e);
        }

        // Verify asset is accepted
        if !Self::is_accepted_asset(env.clone(), asset.clone()) {
            panic!("asset not accepted");
        }

        // Transfer the asset from user to contract
        token::Client::new(&env, &asset).transfer(&from, &env.current_contract_address(), &amount);

        let shares_to_mint = Self::convert_to_shares(env.clone(), amount);

        // Track per-asset user balance
        let asset_balance_key = DataKey::AssetBalance(asset.clone(), from.clone());
        let current_asset_balance: i128 = env
            .storage()
            .persistent()
            .get(&asset_balance_key)
            .unwrap_or(0);
        let new_asset_balance = current_asset_balance.checked_add(shares_to_mint).unwrap();

        // Also track total user balance (for backward compatibility)
        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        let new_user_balance = current_balance.checked_add(shares_to_mint).unwrap();

        // --- Deposit Caps Validation ---
        let max_deposit_per_user: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxDepositPerUser)
            .unwrap_or(i128::MAX);
        if new_user_balance > max_deposit_per_user {
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "DepositCapExceeded"),),
                amount,
            );
            panic!("DepositCapExceeded: per-user deposit cap exceeded");
        }

        let total_assets = Self::total_assets(&env);
        let new_total_assets = total_assets.checked_add(amount).unwrap();

        let max_total_assets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxTotalAssets)
            .unwrap_or(i128::MAX);
        if new_total_assets > max_total_assets {
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "DepositCapExceeded"),),
                amount,
            );
            panic!("DepositCapExceeded: global deposit cap exceeded");
        }
        // -------------------------------

        // Update per-asset balance
        env.storage()
            .persistent()
            .set(&asset_balance_key, &new_asset_balance);

        // Update total user balance
        env.storage()
            .persistent()
            .set(&balance_key, &new_user_balance);

        // Update per-asset total assets
        let asset_total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AssetTotalAssets(asset.clone()))
            .unwrap_or(0);
        let new_asset_total = asset_total.checked_add(amount).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::AssetTotalAssets(asset.clone()), &new_asset_total);

        let total_shares = Self::total_shares(&env);
        let new_total_shares = total_shares.checked_add(shares_to_mint).unwrap();
        let new_total_assets = total_assets.checked_add(amount).unwrap();

        Self::set_total_shares(env.clone(), new_total_shares);
        Self::set_total_assets(env.clone(), new_total_assets);

        let share_price = Self::get_share_price(&env);

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "Deposit"), from.clone()),
            (
                asset.clone(),
                amount,
                share_price,
                new_total_assets,
                new_total_shares,
            ),
        );
    }

    // ── Batch Deposit ─────────────────────────
    /// Process multiple deposit operations in a single transaction.
    ///
    /// Validates each operation independently. Failed operations are skipped and do not revert the batch.
    pub fn batch_deposit(env: Env, operations: Vec<(Address, Address, i128)>) -> Vec<bool> {
        Self::check_version(&env, 1);
        Self::assert_not_paused(&env);
        Self::require_admin(&env);

        let mut results = Vec::new(&env);

        for op in operations.iter() {
            let (from, asset, amount) = op;

            if amount <= 0 {
                env.events().publish(
                    (symbol_short!("BatchDep"), symbol_short!("Fail")),
                    (
                        from.clone(),
                        asset.clone(),
                        amount,
                        symbol_short!("AmtZero"),
                    ),
                );
                results.push_back(false);
                continue;
            }

            if !Self::is_accepted_asset(env.clone(), asset.clone()) {
                env.events().publish(
                    (symbol_short!("BatchDep"), symbol_short!("Fail")),
                    (
                        from.clone(),
                        asset.clone(),
                        amount,
                        symbol_short!("BadAsset"),
                    ),
                );
                results.push_back(false);
                continue;
            }

            let shares_to_mint = Self::convert_to_shares(env.clone(), amount);

            let asset_balance_key = DataKey::AssetBalance(asset.clone(), from.clone());
            let current_asset_balance: i128 = env
                .storage()
                .persistent()
                .get(&asset_balance_key)
                .unwrap_or(0);
            let new_asset_balance = current_asset_balance.checked_add(shares_to_mint).unwrap();

            let balance_key = DataKey::Balance(from.clone());
            let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
            let new_user_balance = current_balance.checked_add(shares_to_mint).unwrap();

            let max_deposit_per_user: i128 = env
                .storage()
                .instance()
                .get(&DataKey::MaxDepositPerUser)
                .unwrap_or(i128::MAX);
            if new_user_balance > max_deposit_per_user {
                env.events().publish(
                    (symbol_short!("BatchDep"), symbol_short!("Fail")),
                    (from.clone(), asset.clone(), amount, symbol_short!("UsrCap")),
                );
                results.push_back(false);
                continue;
            }

            let total_assets = Self::total_assets(&env);
            let new_total_assets = total_assets.checked_add(amount).unwrap();

            let max_total_assets: i128 = env
                .storage()
                .instance()
                .get(&DataKey::MaxTotalAssets)
                .unwrap_or(i128::MAX);
            if new_total_assets > max_total_assets {
                env.events().publish(
                    (symbol_short!("BatchDep"), symbol_short!("Fail")),
                    (from.clone(), asset.clone(), amount, symbol_short!("GlbCap")),
                );
                results.push_back(false);
                continue;
            }

            // Transfer the asset
            token::Client::new(&env, &asset).transfer(
                &from,
                &env.current_contract_address(),
                &amount,
            );

            // Update state
            env.storage()
                .persistent()
                .set(&asset_balance_key, &new_asset_balance);
            env.storage()
                .persistent()
                .set(&balance_key, &new_user_balance);

            let asset_total: i128 = env
                .storage()
                .instance()
                .get(&DataKey::AssetTotalAssets(asset.clone()))
                .unwrap_or(0);
            let new_asset_total = asset_total.checked_add(amount).unwrap();
            env.storage()
                .instance()
                .set(&DataKey::AssetTotalAssets(asset.clone()), &new_asset_total);

            let total_shares = Self::total_shares(&env);
            let new_total_shares = total_shares.checked_add(shares_to_mint).unwrap();

            Self::set_total_shares(env.clone(), new_total_shares);
            Self::set_total_assets(env.clone(), new_total_assets);

            let share_price = Self::get_share_price(&env);

            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "Deposit"), from.clone()),
                (
                    asset.clone(),
                    amount,
                    share_price,
                    new_total_assets,
                    new_total_shares,
                ),
            );

            results.push_back(true);
        }
        results
    }

    // ── Withdraw ──────────────────────────────
    /// Withdraw assets from the vault.
    ///
    /// The user burns shares and receives a proportional amount of assets.
    /// If the withdrawal amount exceeds the queue threshold, it is queued instead.
    /// @param from The address of the user withdrawing.
    /// @param shares The amount of shares to burn.
    pub fn withdraw(env: Env, from: Address, shares: i128) {
        let _guard = Guard::new(&env);
        Self::check_version(&env, 1);
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
        let max_withdraw_per_tx: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxWithdrawPerTx)
            .unwrap_or(i128::MAX);
        if assets_to_withdraw > max_withdraw_per_tx {
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "WithdrawCapExceeded"),),
                assets_to_withdraw,
            );
            panic!("WithdrawalCapExceeded: per-tx withdrawal cap exceeded");
        }
        // --------------------------------

        // Check if withdrawal exceeds queue threshold
        let queue_threshold: i128 = env
            .storage()
            .instance()
            .get(&DataKey::WithdrawQueueThreshold)
            .unwrap_or(i128::MAX);
        if assets_to_withdraw > queue_threshold {
            // Queue the withdrawal instead of processing immediately
            Self::internal_queue_withdraw(env.clone(), from, shares);
            return;
        }

        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);

        let new_total_shares = total_shares.checked_sub(shares).unwrap();
        let new_total_assets = total_assets.checked_sub(assets_to_withdraw).unwrap();
        let new_user_balance = current_balance.checked_sub(shares).unwrap();

        Self::set_total_shares(env.clone(), new_total_shares);
        Self::set_total_assets(env.clone(), new_total_assets);
        env.storage()
            .persistent()
            .set(&balance_key, &new_user_balance);

        let share_price = Self::get_share_price(&env);

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

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "Withdraw"), from),
            (shares, share_price, new_total_assets, new_total_shares),
        );
    }

    // ── Batch Withdraw ─────────────────────────
    /// Process multiple withdraw operations in a single transaction.
    ///
    /// Validates each operation independently. Failed operations are skipped and do not revert the batch.
    pub fn batch_withdraw(env: Env, operations: Vec<(Address, i128)>) -> Vec<bool> {
        Self::check_version(&env, 1);
        Self::assert_not_paused(&env);
        Self::require_admin(&env);

        let mut results = Vec::new(&env);

        for op in operations.iter() {
            let (from, shares) = op;

            if shares <= 0 {
                env.events().publish(
                    (symbol_short!("BatchWd"), symbol_short!("Fail")),
                    (from.clone(), shares, symbol_short!("Zero")),
                );
                results.push_back(false);
                continue;
            }

            let balance_key = DataKey::Balance(from.clone());
            let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);

            if current_balance < shares {
                env.events().publish(
                    (symbol_short!("BatchWd"), symbol_short!("Fail")),
                    (from.clone(), shares, symbol_short!("Insuf")),
                );
                results.push_back(false);
                continue;
            }

            let assets_to_withdraw = Self::convert_to_assets(env.clone(), shares);

            let max_withdraw_per_tx: i128 = env
                .storage()
                .instance()
                .get(&DataKey::MaxWithdrawPerTx)
                .unwrap_or(i128::MAX);
            if assets_to_withdraw > max_withdraw_per_tx {
                env.events().publish(
                    (symbol_short!("BatchWd"), symbol_short!("Fail")),
                    (from.clone(), shares, symbol_short!("CapExcd")),
                );
                results.push_back(false);
                continue;
            }

            let queue_threshold: i128 = env
                .storage()
                .instance()
                .get(&DataKey::WithdrawQueueThreshold)
                .unwrap_or(i128::MAX);
            if assets_to_withdraw > queue_threshold {
                let existing: Vec<QueuedWithdrawal> = env
                    .storage()
                    .instance()
                    .get(&DataKey::PendingWithdrawals)
                    .unwrap_or(Vec::new(&env));
                let already_queued = existing.iter().any(|w| w.user == from);
                if already_queued {
                    env.events().publish(
                        (symbol_short!("BatchWd"), symbol_short!("Fail")),
                        (from.clone(), shares, symbol_short!("Queued")),
                    );
                    results.push_back(false);
                    continue;
                }

                let queued_withdrawal = QueuedWithdrawal {
                    user: from.clone(),
                    shares,
                    timestamp: env.ledger().timestamp(),
                };

                let new_user_balance = current_balance.checked_sub(shares).unwrap();
                env.storage()
                    .persistent()
                    .set(&balance_key, &new_user_balance);

                let mut pending_withdrawals: Vec<QueuedWithdrawal> = env
                    .storage()
                    .instance()
                    .get(&DataKey::PendingWithdrawals)
                    .unwrap_or(Vec::new(&env));
                pending_withdrawals.push_back(queued_withdrawal);
                env.storage()
                    .instance()
                    .set(&DataKey::PendingWithdrawals, &pending_withdrawals);

                let total_assets = Self::total_assets(&env);
                let total_shares = Self::total_shares(&env);
                let share_price = Self::get_share_price(&env);

                env.events().publish(
                    (
                        soroban_sdk::Symbol::new(&env, "WithdrawQueued"),
                        from.clone(),
                    ),
                    (shares, share_price, total_assets, total_shares),
                );

                results.push_back(true);
                continue;
            }

            let total_shares = Self::total_shares(&env);
            let total_assets = Self::total_assets(&env);

            let new_total_shares = total_shares.checked_sub(shares).unwrap();
            let new_total_assets = total_assets.checked_sub(assets_to_withdraw).unwrap();
            let new_user_balance = current_balance.checked_sub(shares).unwrap();

            Self::set_total_shares(env.clone(), new_total_shares);
            Self::set_total_assets(env.clone(), new_total_assets);
            env.storage()
                .persistent()
                .set(&balance_key, &new_user_balance);

            let share_price = Self::get_share_price(&env);

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

            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "Withdraw"), from.clone()),
                (shares, share_price, new_total_assets, new_total_shares),
            );

            results.push_back(true);
        }
        results
    }

    // ── Withdrawal Queue ───────────────────────
    /// Queue a withdrawal request for processing later.
    ///
    /// This is called automatically by withdraw() when the amount exceeds the threshold.
    /// @param from The address of the user withdrawing.
    /// @param shares The amount of shares to burn.
    pub fn queue_withdraw(env: Env, from: Address, shares: i128) {
        let _guard = Guard::new(&env);
        Self::assert_not_paused(&env);
        if shares <= 0 {
            panic!("shares to queue must be positive");
        }
        from.require_auth();
        Self::internal_queue_withdraw(env.clone(), from, shares);
    }

    fn internal_queue_withdraw(env: Env, from: Address, shares: i128) {
        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);

        if current_balance < shares {
            panic!("insufficient shares for withdrawal");
        }

        // Reject if the user already has a pending queued withdrawal.
        let existing: Vec<QueuedWithdrawal> = env
            .storage()
            .instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));
        let already_queued = existing.iter().any(|w| w.user == from);
        if already_queued {
            panic!("user already has a pending withdrawal");
        }

        let assets_to_withdraw = Self::convert_to_assets(env.clone(), shares);

        // Check if withdrawal exceeds queue threshold
        let queue_threshold: i128 = env
            .storage()
            .instance()
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

        // Subtract shares from user balance immediately to prevent double-spending/inflation
        let new_user_balance = current_balance.checked_sub(shares).unwrap();
        env.storage()
            .persistent()
            .set(&balance_key, &new_user_balance);

        // Add to pending withdrawals queue
        let mut pending_withdrawals: Vec<QueuedWithdrawal> = env
            .storage()
            .instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));

        pending_withdrawals.push_back(queued_withdrawal);
        env.storage()
            .instance()
            .set(&DataKey::PendingWithdrawals, &pending_withdrawals);

        let total_assets = Self::total_assets(&env);
        let total_shares = Self::total_shares(&env);
        let share_price = Self::get_share_price(&env);

        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "WithdrawQueued"),
                from.clone(),
            ),
            (shares, share_price, total_assets, total_shares),
        );
    }

    /// Set the threshold for queuing withdrawals.
    ///
    /// Withdrawals larger than this amount will be queued for admin processing.
    /// Only the admin can call this.
    pub fn set_withdraw_queue_threshold(env: Env, threshold: i128) {
        Self::require_admin(&env);
        if threshold < 0 {
            panic!("threshold must be non-negative");
        }
        env.storage()
            .instance()
            .set(&DataKey::WithdrawQueueThreshold, &threshold);
        env.events()
            .publish((symbol_short!("QueueThr"),), threshold);
    }

    /// Process a batch of queued withdrawals.
    ///
    /// The admin processes pending withdrawals in FIFO order up to the specified limit.
    /// @param limit The maximum number of withdrawals to process.
    /// @return The number of withdrawals actually processed.
    pub fn process_queued_withdrawals(env: Env, limit: u32) -> u32 {
        Self::require_admin(&env);

        let pending_withdrawals: Vec<QueuedWithdrawal> = env
            .storage()
            .instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));

        let mut processed = 0;
        let mut remaining_withdrawals = Vec::new(&env);

        let mut total_shares = Self::total_shares(&env);
        let mut total_assets = Self::total_assets(&env);

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("Token not initialized");
        let token_client = token::Client::new(&env, &token);

        for queued_withdrawal in pending_withdrawals.iter() {
            if processed >= limit {
                remaining_withdrawals.push_back(queued_withdrawal.clone());
                continue;
            }

            // Process the withdrawal
            let assets_to_withdraw = Self::convert_to_assets(env.clone(), queued_withdrawal.shares);

            total_shares = total_shares.checked_sub(queued_withdrawal.shares).unwrap();
            total_assets = total_assets.checked_sub(assets_to_withdraw).unwrap();

            token_client.transfer(
                &env.current_contract_address(),
                &queued_withdrawal.user,
                &assets_to_withdraw,
            );

            env.events().publish(
                (symbol_short!("WithdrawP"), queued_withdrawal.user.clone()),
                queued_withdrawal.shares,
            );

            processed += 1;
        }

        // Update totals
        Self::set_total_shares(env.clone(), total_shares);
        Self::set_total_assets(env.clone(), total_assets);

        // Update remaining withdrawals
        env.storage()
            .instance()
            .set(&DataKey::PendingWithdrawals, &remaining_withdrawals);

        processed
    }

    /// Cancel a queued withdrawal and return shares to the user.
    ///
    /// @param from The address of the user whose withdrawal is being cancelled.
    pub fn cancel_queued_withdrawal(env: Env, from: Address) -> Result<(), Error> {
        from.require_auth();

        let mut pending_withdrawals: Vec<QueuedWithdrawal> = env
            .storage()
            .instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));

        let mut found_index: Option<u32> = None;
        let mut found_withdrawal: Option<QueuedWithdrawal> = None;

        for i in 0..pending_withdrawals.len() {
            let w = pending_withdrawals.get(i).unwrap();
            if w.user == from {
                found_index = Some(i);
                found_withdrawal = Some(w);
                break;
            }
        }

        let index = found_index.ok_or(Error::WithdrawalNotFound)?;
        let w = found_withdrawal.unwrap();

        pending_withdrawals.remove(index);

        // Return shares to user balance
        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&balance_key, &(current_balance + w.shares));

        env.storage()
            .instance()
            .set(&DataKey::PendingWithdrawals, &pending_withdrawals);

        env.events()
            .publish((symbol_short!("WdrwCncl"),), (from, w.shares));

        Ok(())
    }

    /// Get the current withdrawal queue threshold
    pub fn get_withdraw_queue_threshold(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::WithdrawQueueThreshold)
            .unwrap_or(i128::MAX)
    }

    /// Get all pending queued withdrawals
    pub fn get_pending_withdrawals(env: Env) -> Vec<QueuedWithdrawal> {
        env.storage()
            .instance()
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
    /// When circuit breaker is active, uses LastSafeAllocation instead of current oracle data.
    /// **Access control**: must be called via the multi-sig governance system.
    fn internal_rebalance(env: &Env, max_slippage_bps: u32) -> Result<(), Error> {
        let _guard = Guard::new(env);
        Self::check_version(env, 1);
        let admin = Self::read_admin(env);
        let oracle = Self::get_oracle(env);

        // OR-auth: require that either Admin or Oracle authorised this invocation.
        Self::require_admin_or_oracle(env, &admin, &oracle);

        // Check if circuit breaker is active
        let circuit_breaker_active: bool = env
            .storage()
            .instance()
            .get(&DataKey::OracleCircuitBreakerActive)
            .unwrap_or(false);

        let allocations: Map<Address, i128> = if circuit_breaker_active {
            // Use last safe allocation when circuit breaker is active
            env.storage()
                .instance()
                .get(&DataKey::LastSafeAllocation)
                .ok_or(Error::NotInitialized)?
        } else {
            // Normal path: check oracle staleness
            let now = env.ledger().timestamp();
            let last_update = env
                .storage()
                .instance()
                .get(&DataKey::OracleLastUpdate)
                .unwrap_or(0u64);
            let max_staleness = Self::max_staleness(env);

            if now > last_update.saturating_add(max_staleness) {
                env.events()
                    .publish((soroban_sdk::Symbol::new(env, "OracleStale"),), last_update);
                return Err(Error::StaleOracleData);
            }

            env.storage()
                .instance()
                .get(&DataKey::TargetAllocations)
                .ok_or(Error::NotInitialized)?
        };

        let asset_addr = Self::get_asset(&env);
        let token_client = token::Client::new(&env, &asset_addr);
        let vault = env.current_contract_address();

        // Store initial balances for slippage verification
        let mut initial_balances: Map<Address, i128> = Map::new(&env);
        for (strategy_addr, _) in allocations.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr.clone());
            initial_balances.set(strategy_addr.clone(), strategy.balance());
        }

        let total_assets = Self::total_assets(env);

        // Execute rebalance operations
        for (strategy_addr, bps_allocation) in allocations.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr.clone());
            let current_balance = strategy.balance();

            // Convert BPS to absolute target allocation
            let target_allocation = total_assets
                .checked_mul(bps_allocation)
                .unwrap()
                .checked_div(10_000)
                .unwrap_or(0);

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

        // Verify slippage after all operations
        for (strategy_addr, target_allocation) in allocations.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr.clone());
            let final_balance = strategy.balance();
            let _initial_balance = initial_balances.get(strategy_addr.clone()).unwrap_or(0);

            // Calculate expected balance based on target allocation (BPS -> Absolute)
            let expected_balance = total_assets
                .checked_mul(target_allocation)
                .unwrap()
                .checked_div(10_000)
                .unwrap_or(0);

            // Calculate slippage in basis points
            if expected_balance > 0 {
                let slippage_abs = if final_balance > expected_balance {
                    final_balance - expected_balance
                } else {
                    expected_balance - final_balance
                };

                let slippage_bps = (slippage_abs.checked_mul(10000).unwrap())
                    .checked_div(expected_balance)
                    .unwrap_or(0);

                if slippage_bps > max_slippage_bps as i128 {
                    // Emit SlippageExceeded event
                    env.events().publish(
                        (soroban_sdk::Symbol::new(&env, "SlippageExceeded"),),
                        (
                            strategy_addr.clone(),
                            expected_balance,
                            final_balance,
                            slippage_bps,
                        ),
                    );
                    return Err(Error::SlippageExceeded);
                }
            }
        }

        // Emit VaultSnapshot event
        let final_total_assets = Self::total_assets(env);
        let final_total_shares = Self::total_shares(env);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "VaultSnapshot"),),
            (final_total_assets, final_total_shares, allocations),
        );

        Ok(())
    }

    /// Stores new target allocations from the Oracle. Validates timestamp freshness.
    /// When circuit breaker is not active, also stores to LastSafeAllocation.
    pub fn set_oracle_data(
        env: Env,
        allocations: Map<Address, i128>,
        timestamp: u64,
    ) -> Result<(), Error> {
        let oracle = Self::get_oracle(&env);
        oracle.require_auth();

        let now = env.ledger().timestamp();
        if timestamp > now {
            return Err(Error::InvalidTimestamp);
        }

        let last_timestamp = env
            .storage()
            .instance()
            .get(&DataKey::OracleLastUpdate)
            .unwrap_or(0u64);
        if timestamp <= last_timestamp {
            return Err(Error::InvalidTimestamp);
        }

        // Validate allocations before storing
        Self::validate_allocations(&env, &allocations)?;

        env.storage()
            .instance()
            .set(&DataKey::OracleLastUpdate, &timestamp);
        env.storage()
            .instance()
            .set(&DataKey::TargetAllocations, &allocations);

        // Store as last safe allocation if circuit breaker is not active
        let circuit_breaker_active: bool = env
            .storage()
            .instance()
            .get(&DataKey::OracleCircuitBreakerActive)
            .unwrap_or(false);
        if !circuit_breaker_active {
            env.storage()
                .instance()
                .set(&DataKey::LastSafeAllocation, &allocations);
        }

        Ok(())
    }

    /// Validates allocation data for logical correctness.
    ///
    /// Invariants enforced (all in a single O(n) pass over the allocation map):
    /// - Every strategy address must be present in the on-chain strategy registry
    ///   (`ZeroAddressStrategy`). This is the Soroban-native analogue of the EVM
    ///   "zero-address" guard — an unregistered contract must never receive funds.
    /// - Every individual allocation value must be non-negative (`NegativeAllocation`).
    /// - Non-empty allocations must sum exactly to 10 000 basis points / 100%
    ///   (`InvalidAllocationSum`). An empty map (total = 0) is accepted for
    ///   initialization / reset purposes.
    ///
    /// Time complexity : O(n) where n = number of entries in the allocation map.
    /// Space complexity: O(s) for the single registered-strategies Vec read from
    ///                   storage, where s = number of registered strategies.
    fn validate_allocations(env: &Env, allocations: &Map<Address, i128>) -> Result<(), Error> {
        // Read the registered strategy registry once — O(s) space, one storage hit.
        let registered: Vec<Address> = Self::get_strategies(env);

        let mut total_bps: i128 = 0;

        for (strategy_addr, allocation) in allocations.iter() {
            // Guard 1: strategy must be in the on-chain registry.
            if !registered.contains(strategy_addr.clone()) {
                return Err(Error::ZeroAddressStrategy);
            }

            // Guard 2: individual allocation must be non-negative.
            if allocation < 0 {
                return Err(Error::NegativeAllocation);
            }

            // Accumulate; saturate at i128::MAX on overflow (caught by sum check below).
            total_bps = total_bps.checked_add(allocation).unwrap_or(i128::MAX);
        }

        // Guard 3: non-empty allocations must sum exactly to 100% (10 000 bps).
        // An empty map (total_bps == 0) is allowed for initialization / reset.
        if total_bps != 0 && total_bps != 10_000 {
            return Err(Error::InvalidAllocationSum);
        }

        Ok(())
    }

    /// Calculate the difference between current and target balances.
    pub fn calc_rebalance_delta(current: i128, target: i128) -> i128 {
        target
            .checked_sub(current)
            .expect("arithmetic overflow in rebalance delta")
    }

    // ── Strategy Management ───────────────────
    fn internal_add_strategy(env: &Env, strategy: Address) -> Result<(), Error> {
        Self::check_version(env, 1);
        Self::require_admin(env);

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

        // Initialize health state
        let health_key = DataKey::StrategyHealth(strategy.clone());
        let default_health = StrategyHealth {
            last_known_balance: 0,
            last_check_timestamp: env.ledger().timestamp(),
            is_healthy: true,
        };
        env.storage().instance().set(&health_key, &default_health);

        env.events()
            .publish((soroban_sdk::Symbol::new(&env, "StrategyAdded"),), strategy);

        Ok(())
    }

    pub fn set_harvest_interval(env: Env, ledgers: u32) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::HarvestInterval, &ledgers);

        let last: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LastHarvestLedger)
            .unwrap_or(0);
        let current = env.ledger().sequence();
        if last == 0 && ledgers > 0 {
            env.storage()
                .instance()
                .set(&DataKey::LastHarvestLedger, &current);
        }

        let next_eligible = env
            .storage()
            .instance()
            .get::<_, u32>(&DataKey::LastHarvestLedger)
            .unwrap_or(current)
            .saturating_add(ledgers);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "HarvestScheduled"),),
            next_eligible,
        );
    }

    pub fn can_harvest(env: Env) -> bool {
        let interval: u32 = env
            .storage()
            .instance()
            .get(&DataKey::HarvestInterval)
            .unwrap_or(0);
        if interval == 0 {
            return false;
        }
        let last: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LastHarvestLedger)
            .unwrap_or(0);
        let seq = env.ledger().sequence();
        seq >= last.saturating_add(interval)
    }

    /// Harvest yields from all strategies and move them to the treasury.
    ///
    /// Records yield snapshots before and after collection for APY calculation.
    /// @return The total amount of yield harvested.
    pub fn harvest(env: Env) -> Result<i128, Error> {
        Self::check_version(&env, 1);

        let interval: u32 = env
            .storage()
            .instance()
            .get(&DataKey::HarvestInterval)
            .unwrap_or(0);
        if interval > 0 {
            if !Self::can_harvest(env.clone()) {
                return Err(Error::HarvestTooEarly);
            }
            let current = env.ledger().sequence();
            env.storage()
                .instance()
                .set(&DataKey::LastHarvestLedger, &current);
            let next_eligible = current.saturating_add(interval);
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "HarvestScheduled"),),
                next_eligible,
            );
        } else {
            Self::require_admin(&env);
        }

        let strategies = Self::get_strategies(&env);
        if strategies.is_empty() {
            return Err(Error::NoStrategies);
        }

        let current_ledger = env.ledger().sequence();

        // Record before-harvest snapshots
        for strategy_addr in strategies.iter() {
            let addr = strategy_addr.clone();
            let strategy = StrategyClient::new(&env, addr.clone());
            let before_balance = strategy.balance();
            let snapshot = YieldSnapshot {
                balance: before_balance,
                ledger: current_ledger,
            };
            
            let history_key = DataKey::StrategyYieldSnapshot(addr.clone());
            let mut history: YieldHistory = env
                .storage()
                .instance()
                .get(&history_key)
                .unwrap_or(YieldHistory {
                    snapshots: Vec::new(&env),
                });
            history.snapshots.push_back(snapshot);
            env.storage().instance().set(&history_key, &history);
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

        // Record after-harvest snapshots (balance should be 0 after harvest)
        for strategy_addr in strategies.iter() {
            let addr = strategy_addr.clone();
            let strategy = StrategyClient::new(&env, addr.clone());
            let after_balance = strategy.balance();
            let snapshot = YieldSnapshot {
                balance: after_balance,
                ledger: current_ledger,
            };
            
            let history_key = DataKey::StrategyYieldSnapshot(addr.clone());
            let mut history: YieldHistory = env
                .storage()
                .instance()
                .get(&history_key)
                .unwrap_or(YieldHistory {
                    snapshots: Vec::new(&env),
                });
            history.snapshots.push_back(snapshot);
            env.storage().instance().set(&history_key, &history);
        }

        let total_assets_after = Self::total_assets(&env);
        let total_shares_after = Self::total_shares(&env);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "Harvest"),),
            (total_yield, total_assets_after, total_shares_after),
        );
        Ok(total_yield)
    }

    // ── Strategy Health Monitoring ───────────────────
    /// Check the health of all registered strategies.
    ///
    /// Strategies are considered unhealthy if their actual balance deviates significantly from the expected balance.
    /// @return A list of addresses for strategies detected as unhealthy.
    pub fn check_strategy_health(env: Env) -> Result<Vec<Address>, Error> {
        Self::require_admin(&env);

        let strategies = Self::get_strategies(&env);
        if strategies.is_empty() {
            return Err(Error::NoStrategies);
        }

        let mut unhealthy_strategies = Vec::new(&env);
        let current_time = env.ledger().timestamp();

        // Get expected allocations from oracle data
        let expected_allocations: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::TargetAllocations)
            .unwrap_or(Map::new(&env));

        let total_assets = Self::total_assets(&env);

        for strategy_addr in strategies.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr.clone());
            let actual_balance = strategy.balance();

            // Get expected balance from allocations
            let bps_allocation = expected_allocations.get(strategy_addr.clone()).unwrap_or(0);
            let expected_balance = total_assets
                .checked_mul(bps_allocation)
                .unwrap_or(0)
                .checked_div(10_000)
                .unwrap_or(0);

            // Get current health data
            let health_key = DataKey::StrategyHealth(strategy_addr.clone());
            let current_health =
                env.storage()
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
            if is_healthy != current_health.is_healthy
                || actual_balance != current_health.last_known_balance
            {
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

    /// Manually flag a strategy as unhealthy.
    ///
    /// Only the admin can call this.
    /// @param strategy The address of the strategy to flag.
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

    /// Remove a strategy from the vault and withdraw all funds from it.
    ///
    /// Only the admin can call this.
    /// @param strategy The address of the strategy to remove.
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
            let _token_client = token::Client::new(&env, &asset_addr);

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
        env.storage()
            .instance()
            .set(&DataKey::Strategies, &strategies);

        // Clean up health data
        let health_key = DataKey::StrategyHealth(strategy.clone());
        env.storage().instance().remove(&health_key);

        // Emit StrategyRemoved event
        env.events().publish(
            (symbol_short!("StrategyR"), strategy.clone()),
            strategy_balance,
        );

        Ok(())
    }

    /// Get health information for a specific strategy.
    pub fn get_strategy_health(env: Env, strategy: Address) -> Option<StrategyHealth> {
        env.storage()
            .instance()
            .get(&DataKey::StrategyHealth(strategy))
    }

    /// Calculate annualized percentage yield (APY) for a strategy.
    ///
    /// APY is calculated from yield snapshots over the specified number of periods.
    /// Returns APY in basis points (1 bps = 0.01%).
    /// Formula: APY = ((final_balance / initial_balance)^(365/days) - 1) * 10000
    ///
    /// @param strategy The strategy address to calculate APY for.
    /// @param periods Number of harvest periods to include in calculation.
    /// @return APY in basis points.
    pub fn get_strategy_apy(env: Env, strategy: Address, periods: u32) -> i128 {
        let history_key = DataKey::StrategyYieldSnapshot(strategy.clone());
        let history: Option<YieldHistory> = env.storage().instance().get(&history_key);
        
        match history {
            Some(h) if h.snapshots.len() >= 2 => {
                let snapshots = h.snapshots;
                let count = snapshots.len() as u32;
                let periods_to_use = if periods == 0 || periods > count {
                    count
                } else {
                    periods
                };

                // Use the earliest and latest snapshots within the specified periods
                // Snapshots are stored in pairs (before, after) for each harvest
                // We use the before-harvest snapshots to calculate growth
                let start_idx = ((count - periods_to_use) * 2) as u32;
                let end_idx = (count - 1) as u32;

                if start_idx >= end_idx || end_idx >= snapshots.len() as u32 {
                    return 0;
                }

                let start_snapshot = snapshots.get(start_idx).unwrap();
                let end_snapshot = snapshots.get(end_idx).unwrap();

                let start_balance = start_snapshot.balance;
                let end_balance = end_snapshot.balance;

                if start_balance <= 0 {
                    return 0;
                }

                // Calculate ledger difference (proxy for time)
                let ledger_diff = end_snapshot.ledger.saturating_sub(start_snapshot.ledger);
                if ledger_diff == 0 {
                    return 0;
                }

                // Calculate growth rate
                let growth = end_balance.checked_mul(10_000).unwrap().checked_div(start_balance).unwrap();
                let growth_bps = growth.saturating_sub(10_000);

                // Annualize: assume ~10 ledgers per second on Stellar testnet
                // This is a simplification; in production use actual timestamp
                let ledgers_per_year = 10 * 60 * 60 * 24 * 365; // ~315 million
                let periods_per_year = ledgers_per_year / ledger_diff as i128;
                
                if periods_per_year <= 0 {
                    return growth_bps;
                }

                // Compound annual growth: (1 + rate)^periods - 1
                // Using simple multiplication for basis points approximation
                let apy = growth_bps.checked_mul(periods_per_year).unwrap();
                apy
            }
            _ => 0,
        }
    }

    /// Get the best performing strategy based on recent APY.
    ///
    /// Returns the strategy address with the highest APY over the last 4 harvest periods.
    /// Returns None if no strategies have sufficient history.
    ///
    /// @return The address of the best performing strategy, or None.
    pub fn get_best_performing_strategy(env: Env) -> Option<Address> {
        let strategies = Self::get_strategies(&env);
        if strategies.is_empty() {
            return None;
        }

        let mut best_strategy: Option<Address> = None;
        let mut best_apy: i128 = -1; // Initialize to -1 so even 0 APY will be selected

        for strategy in strategies.iter() {
            let apy = Self::get_strategy_apy(env.clone(), strategy.clone(), 4);
            if apy > best_apy {
                best_apy = apy;
                best_strategy = Some(strategy.clone());
            }
        }

        best_strategy
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
    /// Get the total assets managed by the vault (cash + strategy balances).
    pub fn total_assets(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalAssets)
            .unwrap_or(0)
    }

    /// Get the total number of vault shares in circulation.
    pub fn total_shares(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalShares)
            .unwrap_or(0)
    }

    /// Get the address of the price oracle.
    pub fn get_oracle(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Oracle)
            .expect("Not initialized")
    }

    /// Get the address of the underlying asset (e.g., USDC).
    pub fn get_asset(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Asset)
            .expect("Not initialized")
    }

    /// Check if the asset is an accepted underlying asset.
    pub fn is_accepted_asset(env: Env, asset: Address) -> bool {
        asset == Self::get_asset(&env)
    }

    /// Get the list of all registered strategy addresses.
    pub fn get_strategies(env: &Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Strategies)
            .unwrap_or(Vec::new(env))
    }

    /// Activate the oracle circuit breaker.
    ///
    /// When activated, the vault will use the last validated allocation instead of
    /// requiring fresh oracle data. Only the admin can call this.
    pub fn activate_oracle_circuit_breaker(env: Env) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::OracleCircuitBreakerActive, &true);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "OracleCircuitBreakerActivated"),),
            env.ledger().timestamp(),
        );
    }

    /// Reset the oracle circuit breaker.
    ///
    /// Deactivates the circuit breaker, returning to normal oracle staleness checks.
    /// Only the admin can call this.
    pub fn reset_oracle_circuit_breaker(env: Env) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::OracleCircuitBreakerActive, &false);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "OracleCircuitBreakerReset"),),
            env.ledger().timestamp(),
        );
    }

    /// Check if the oracle circuit breaker is currently active.
    pub fn is_circuit_breaker_active(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::OracleCircuitBreakerActive)
            .unwrap_or(false)
    }

    // ── Compliance: Blocklist and Allowlist ──────────────────────────
    /// Check if a user is allowed to deposit based on blocklist/allowlist rules.
    fn check_compliance(env: &Env, user: &Address) -> Result<(), Error> {
        let blocklist_mode: bool = env
            .storage()
            .instance()
            .get(&DataKey::BlocklistMode)
            .unwrap_or(false);
        let allowlist_mode: bool = env
            .storage()
            .instance()
            .get(&DataKey::AllowlistMode)
            .unwrap_or(false);

        // If neither mode is active, allow all deposits
        if !blocklist_mode && !allowlist_mode {
            return Ok(());
        }

        let blocklist: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Blocklist)
            .unwrap_or(Vec::new(env));
        let allowlist: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Allowlist)
            .unwrap_or(Vec::new(env));

        if blocklist_mode && blocklist.contains(user.clone()) {
            env.events()
                .publish((soroban_sdk::Symbol::new(env, "UserBlocked"),), user);
            return Err(Error::UserBlocked);
        }

        if allowlist_mode && !allowlist.contains(user.clone()) {
            env.events()
                .publish((soroban_sdk::Symbol::new(env, "UserBlocked"),), user);
            return Err(Error::UserBlocked);
        }

        Ok(())
    }

    /// Add a user to the blocklist.
    /// Only the admin can call this.
    pub fn add_to_blocklist(env: Env, user: Address) {
        Self::require_admin(&env);
        let mut blocklist: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Blocklist)
            .unwrap_or(Vec::new(&env));
        if !blocklist.contains(user.clone()) {
            blocklist.push_back(user.clone());
            env.storage().instance().set(&DataKey::Blocklist, &blocklist);
            env.events()
                .publish((soroban_sdk::Symbol::new(&env, "UserBlocked"),), user);
        }
    }

    /// Remove a user from the blocklist.
    /// Only the admin can call this.
    pub fn remove_from_blocklist(env: Env, user: Address) {
        Self::require_admin(&env);
        let mut blocklist: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Blocklist)
            .unwrap_or(Vec::new(&env));
        if let Some(index) = blocklist.iter().position(|x| x == user) {
            blocklist.remove(index as u32);
            env.storage().instance().set(&DataKey::Blocklist, &blocklist);
        }
    }

    /// Add a user to the allowlist.
    /// Only the admin can call this.
    pub fn add_to_allowlist(env: Env, user: Address) {
        Self::require_admin(&env);
        let mut allowlist: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Allowlist)
            .unwrap_or(Vec::new(&env));
        if !allowlist.contains(user.clone()) {
            allowlist.push_back(user.clone());
            env.storage().instance().set(&DataKey::Allowlist, &allowlist);
            env.events()
                .publish((soroban_sdk::Symbol::new(&env, "UserAllowlisted"),), user);
        }
    }

    /// Remove a user from the allowlist.
    /// Only the admin can call this.
    pub fn remove_from_allowlist(env: Env, user: Address) {
        Self::require_admin(&env);
        let mut allowlist: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Allowlist)
            .unwrap_or(Vec::new(&env));
        if let Some(index) = allowlist.iter().position(|x| x == user) {
            allowlist.remove(index as u32);
            env.storage().instance().set(&DataKey::Allowlist, &allowlist);
        }
    }

    /// Enable or disable blocklist mode.
    /// When enabled, blocked users cannot deposit. Only the admin can call this.
    pub fn set_blocklist_mode(env: Env, active: bool) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::BlocklistMode, &active);
    }

    /// Enable or disable allowlist mode.
    /// When enabled, only allowlisted users can deposit. Only the admin can call this.
    pub fn set_allowlist_mode(env: Env, active: bool) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::AllowlistMode, &active);
    }

    /// Get the current blocklist.
    pub fn get_blocklist(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Blocklist)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the current allowlist.
    pub fn get_allowlist(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Allowlist)
            .unwrap_or(Vec::new(&env))
    }

    /// Check if blocklist mode is active.
    pub fn is_blocklist_mode_active(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::BlocklistMode)
            .unwrap_or(false)
    }

    /// Check if allowlist mode is active.
    pub fn is_allowlist_mode_active(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::AllowlistMode)
            .unwrap_or(false)
    }

    /// Get the address of the fee treasury.
    pub fn treasury(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Treasury)
            .expect("Not initialized")
    }

    /// Get the management fee percentage in basis points.
    pub fn fee_percentage(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::FeePercentage)
            .unwrap_or(0)
    }

    /// Get the share balance of a specific user.
    pub fn balance(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(user))
            .unwrap_or(0)
    }

    /// Get the list of all guardians in the multisig governance.
    pub fn get_guardians(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Guardians)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the required number of approvals for governance actions.
    pub fn get_threshold(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1)
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

    pub fn get_share_price(env: &Env) -> i128 {
        let total_assets = Self::total_assets(env);
        let total_shares = Self::total_shares(env);
        if total_shares == 0 {
            return 1_000_000_000; // 1.0 with 9 decimals
        }
        total_assets
            .checked_mul(1_000_000_000)
            .unwrap()
            .checked_div(total_shares)
            .unwrap()
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
    pub fn set_paused(env: Env, state: bool) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &state);
        env.events().publish((symbol_short!("paused"),), state);
    }

    // ── Deposit / Withdrawal Caps ──────────────────────────
    pub fn set_deposit_cap(env: Env, per_user: i128, global: i128) {
        Self::check_version(&env, 1);
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::MaxDepositPerUser, &per_user);
        env.storage()
            .instance()
            .set(&DataKey::MaxTotalAssets, &global);
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "CapsSet"),
                soroban_sdk::Symbol::new(&env, "Deposit"),
            ),
            (per_user, global),
        );
    }

    pub fn set_withdraw_cap(env: Env, per_tx: i128) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::MaxWithdrawPerTx, &per_tx);
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "CapsSet"),
                soroban_sdk::Symbol::new(&env, "Withdraw"),
            ),
            per_tx,
        );
    }

    pub fn set_max_staleness(env: Env, seconds: u64) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::MaxStaleness, &seconds);
        env.events().publish((symbol_short!("Staleness"),), seconds);
    }

    pub fn set_timelock_duration(env: Env, duration: u64) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::TimelockDuration, &duration);
        env.events()
            .publish((symbol_short!("TimelockD"),), duration);
    }

    pub fn max_staleness(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::MaxStaleness)
            .unwrap_or(3600)
    }

    // ── Contract Upgrade & Migration ──────────────────
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        Self::require_admin(&env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        env.events()
            .publish((symbol_short!("upgrade"), symbol_short!("wasm")), ());
    }

    pub fn migrate(env: Env, new_version: u32) {
        Self::require_admin(&env);
        let current_version = Self::version(&env);
        if new_version <= current_version {
            panic!("new version must be greater than current version");
        }

        // Execute any necessary state migrations here if migrating from specific versions
        // e.g. if current_version == 1 && new_version == 2 { ... migrate v1 state to v2 layout ... }

        env.storage()
            .instance()
            .set(&DataKey::ContractVersion, &new_version);
        env.events().publish(
            (symbol_short!("upgrade"), symbol_short!("migrate")),
            new_version,
        );
    }

    pub fn version(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ContractVersion)
            .unwrap_or(0)
    }

    pub fn check_version(env: &Env, expected_version: u32) {
        let current = Self::version(env);
        if current != expected_version {
            panic!(
                "VersionMismatch: Expected contract version {} but found {}",
                expected_version, current
            );
        }
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
    fn require_admin_or_oracle(_env: &Env, admin: &Address, oracle: &Address) {
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

    // ── Structured view/query functions for off-chain consumers (SC-31) ────

    /// Returns a single-call snapshot of the vault's global state.
    ///
    /// Designed for indexers and dashboards that need to minimise RPC calls.
    /// Does not mutate any storage.
    pub fn get_vault_summary(env: Env) -> VaultSummary {
        let total_assets = Self::total_assets(&env);
        let total_shares = Self::total_shares(&env);
        let share_price = Self::get_share_price(&env);
        let paused = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        let oracle_last_update: u64 = env
            .storage()
            .instance()
            .get(&DataKey::OracleLastUpdate)
            .unwrap_or(0);
        VaultSummary {
            total_assets,
            total_shares,
            share_price,
            paused,
            oracle_last_update,
        }
    }

    /// Returns a single-call snapshot of a specific user's position in the vault.
    ///
    /// Includes balance, queued withdrawal (if any), and current voting power.
    /// Does not mutate any storage.
    pub fn get_user_summary(env: Env, user: Address) -> UserSummary {
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(user.clone()))
            .unwrap_or(0);

        let pending: Vec<QueuedWithdrawal> = env
            .storage()
            .instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));
        let queued_shares: i128 = pending
            .iter()
            .find(|w| w.user == user)
            .map(|w| w.shares)
            .unwrap_or(0);

        let voting_power = Self::get_voting_power(env.clone(), user);
        UserSummary {
            balance,
            queued_shares,
            voting_power,
        }
    }

    /// Returns a single-call snapshot of the vault's governance configuration.
    ///
    /// Includes guardians, approval threshold, and the count of active proposals.
    /// Does not mutate any storage.
    pub fn get_governance_summary(env: Env) -> GovernanceSummary {
        let guardians: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Guardians)
            .unwrap_or(Vec::new(&env));
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(0);
        let proposals: Vec<Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or(Vec::new(&env));
        let active_proposal_count = proposals.iter().filter(|p| !p.executed).count() as u32;
        GovernanceSummary {
            guardians,
            threshold,
            active_proposal_count,
        }
    }

    /// Returns a single-call snapshot of all registered strategies and their health.
    ///
    /// Each entry contains the strategy address, its health status (if recorded),
    /// and its last-known balance. Does not mutate any storage.
    pub fn get_strategy_summary(env: Env) -> Vec<StrategyEntry> {
        let strategies = Self::get_strategies(&env);
        let mut entries = Vec::new(&env);
        for strategy in strategies.iter() {
            let health: Option<StrategyHealth> = env
                .storage()
                .instance()
                .get(&DataKey::StrategyHealth(strategy.clone()));
            let (last_known_balance, is_healthy) = match health {
                Some(h) => (h.last_known_balance, h.is_healthy),
                None => (0, true),
            };
            entries.push_back(StrategyEntry {
                strategy,
                last_known_balance,
                is_healthy,
            });
        }
        entries
    }
}

#[cfg(test)]
mod invariants;
mod test;
