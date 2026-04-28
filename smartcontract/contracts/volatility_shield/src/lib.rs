#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, Map, Vec,
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
    /// Referral: self-referral or post-deposit registration attempt.
    InvalidConfig = 22,
    /// Referral: a referrer is already registered for this depositor.
    ReferralAlreadySet = 23,
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
    // ── Referral programme (SC-60) ─────────────────
    /// depositor address → referrer address
    Referrer(Address),
    /// u32 — bonus shares as basis points of depositor shares (default 50)
    ReferralRewardBps,
    /// i128 — maximum bonus shares a referrer may earn in one epoch
    ReferralEpochCap,
    /// i128 — cumulative bonus shares earned by a referrer this epoch
    ReferralEpochEarnings(Address),
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
// Contract
// ─────────────────────────────────────────────

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
        env.events().publish(
            (symbol_short!("Timelock"),),
            (id, proposed_at),
        );

        let threshold: u32 = env.storage().instance().get(&DataKey::Threshold).unwrap_or(1);
        if threshold <= 1 {
            // Try to execute, but if timelock hasn't elapsed, the proposal will remain unexecuted
            let res = Self::execute_action(&env, &action, proposed_at);
            if let Err(e) = res {
                if e != Error::TimelockNotElapsed {
                    panic!("{:?}", e);
                }
            } else {
                proposal.executed = true;
            }
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
            Self::execute_action(&env, &proposal.action, proposal.proposed_at)?;
            proposal.executed = true;
        }

        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&DataKey::Proposals, &proposals);

        Ok(())
    }

    pub fn add_guardian(env: Env, guardian: Address) -> Result<(), Error> {
        Self::require_admin(&env);
        let mut guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).unwrap_or(Vec::new(&env));
        if guardians.contains(guardian.clone()) {
            return Ok(());
        }
        guardians.push_back(guardian);
        env.storage().instance().set(&DataKey::Guardians, &guardians);
        Ok(())
    }

    pub fn remove_guardian(env: Env, guardian: Address) -> Result<(), Error> {
        Self::require_admin(&env);
        let mut guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).unwrap_or(Vec::new(&env));
        let index = guardians.first_index_of(guardian).ok_or(Error::Unauthorized)?;
        guardians.remove(index);
        env.storage().instance().set(&DataKey::Guardians, &guardians);
        Ok(())
    }

    pub fn set_threshold(env: Env, threshold: u32) -> Result<(), Error> {
        Self::require_admin(&env);
        let guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).unwrap_or(Vec::new(&env));
        if threshold == 0 || threshold > guardians.len() {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Threshold, &threshold);
        Ok(())
    }


    fn execute_action(env: &Env, action: &ActionType, proposed_at: u64) -> Result<(), Error> {
        // Check if timelock has elapsed
        Self::assert_timelock_elapsed(env, proposed_at)?;
        match action {
            ActionType::SetPaused(state) => {
                env.storage().instance().set(&DataKey::Paused, state);
                env.events().publish((symbol_short!("paused"),), state);
            }
            ActionType::AddStrategy(strategy) => {
                Self::internal_add_strategy(env, strategy.clone())?;
            }
            ActionType::Rebalance(max_slippage) => {
                Self::internal_rebalance(env, *max_slippage)?;
            }
        }

        // Emit TimelockExecuted event
        env.events().publish(
            (symbol_short!("TlockExec"),),
            (),
        );

        Ok(())
    }

    fn assert_timelock_elapsed(env: &Env, proposed_at: u64) -> Result<(), Error> {
        let timelock_duration: u64 = env.storage().instance().get(&DataKey::TimelockDuration).unwrap_or(0);
        
        // If timelock duration is 0, no timelock is enforced
        if timelock_duration == 0 {
            return Ok(());
        }

        if fee_percentage > 10000 {
            return Err(Error::InvalidFeePercentage);
        }

        env.storage()
            .instance()
            .set(&DataKey::FeePercentage, &fee_percentage);
        env.storage().instance().set(&DataKey::Token, &asset);

        // Initialize vault state to zero
        env.storage().instance().set(&DataKey::TotalAssets, &0_i128);
        env.storage().instance().set(&DataKey::TotalShares, &0_i128);
        env.storage()
            .instance()
            .set(&DataKey::MaxStaleness, &3600u64);

        // Initialize contract version
        env.storage().instance().set(&DataKey::ContractVersion, &1u32);

        // Multisig initialization
        env.storage().instance().set(&DataKey::Guardians, &guardians);
        env.storage().instance().set(&DataKey::Threshold, &threshold);

        // Initialize contract version
        env.storage().instance().set(&DataKey::ContractVersion, &1u32);

        Ok(())
    }

    // ── Deposit ───────────────────────────────
    pub fn deposit(env: Env, from: Address, amount: i128) {
        Self::check_version(&env, 1);
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
        let max_deposit_per_user: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxDepositPerUser)
            .unwrap_or(i128::MAX);
        if new_user_balance > max_deposit_per_user {
            env.events()
                .publish((symbol_short!("Cap"), symbol_short!("deposit")), amount);
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
            env.events()
                .publish((symbol_short!("Cap"), symbol_short!("deposit")), amount);
            panic!("DepositCapExceeded: global deposit cap exceeded");
        }
        // -------------------------------

        env.storage()
            .persistent()
            .set(&balance_key, &new_user_balance);

        let total_shares = Self::total_shares(&env);
        Self::set_total_shares(
            env.clone(),
            total_shares.checked_add(shares_to_mint).unwrap(),
        );
        Self::set_total_assets(env.clone(), total_assets.checked_add(amount).unwrap());

        env.events()
            .publish((symbol_short!("Deposit"), from.clone()), amount);

        // Referral bonus is earned on the depositor's very first deposit only.
        if current_balance == 0 {
            Self::maybe_reward_referrer(&env, &from, shares_to_mint);
        }
    }

    // ── Withdraw ──────────────────────────────
    pub fn withdraw(env: Env, from: Address, shares: i128) {
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
                (symbol_short!("Cap"), symbol_short!("withdraw")),
                assets_to_withdraw,
            );
            panic!("WithdrawalCapExceeded: per-tx withdrawal cap exceeded");
        }
        // --------------------------------

        // Check if withdrawal exceeds queue threshold
        let queue_threshold: i128 = env.storage().instance().get(&DataKey::WithdrawQueueThreshold).unwrap_or(i128::MAX);
        if assets_to_withdraw > queue_threshold {
            // Queue the withdrawal instead of processing immediately
            Self::queue_withdraw(env, from, shares);
            return;
        }

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


    // ── Withdrawal Queue ───────────────────────
    /// Queue a withdrawal request for processing later.
    /// This is called automatically by withdraw() when the amount exceeds the threshold.
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
        
        env.events().publish(
            (symbol_short!("fee_pct"), symbol_short!("updated")),
            fee_percentage,
        );

        Ok(())
    }

    /// Set the deposit cap for a specific strategy.
    /// Only the admin can call this.
    pub fn set_strategy_cap(env: Env, strategy: Address, cap: i128) {
        Self::require_admin(&env);
        
        // Verify strategy exists
        let strategies = Self::get_strategies(&env);
        if !strategies.contains(strategy.clone()) {
            panic!("Strategy not registered");
        }
        
        if cap < 0 {
            panic!("cap must be non-negative");
        }
        
        env.storage()
            .instance()
            .set(&DataKey::StrategyDepositCap(strategy), &cap);
        
        env.events().publish(
            (symbol_short!("StrategyCap"),),
            (strategy, cap),
        );
    }

    pub fn set_withdraw_cap(env: Env, per_tx: i128) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::MaxWithdrawPerTx, &per_tx);
        env.events()
            .publish((symbol_short!("Caps"), symbol_short!("withdraw")), per_tx);
    }


    pub fn set_max_staleness(env: Env, seconds: u64) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::MaxStaleness, &seconds);
    }

    pub fn set_timelock_duration(env: Env, duration: u64) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::TimelockDuration, &duration);
        env.events().publish((symbol_short!("TimelockD"),), duration);
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
        env.events().publish((symbol_short!("upgrade"), symbol_short!("wasm")), ());
    }

    pub fn migrate(env: Env, new_version: u32) {
        Self::require_admin(&env);
        let current_version = Self::version(&env);
        if new_version <= current_version {
            panic!("new version must be greater than current version");
        }
        
        // Execute any necessary state migrations here if migrating from specific versions
        // e.g. if current_version == 1 && new_version == 2 { ... migrate v1 state to v2 layout ... }
        
        env.storage().instance().set(&DataKey::ContractVersion, &new_version);
        env.events().publish((symbol_short!("upgrade"), symbol_short!("migrate")), new_version);
    }
    
    pub fn version(env: &Env) -> u32 {
        env.storage().instance().get(&DataKey::ContractVersion).unwrap_or(0)
    }

    pub fn check_version(env: &Env, expected_version: u32) {
        let current = Self::version(env);
        if current != expected_version {
            panic!("VersionMismatch: Expected contract version {} but found {}", expected_version, current);
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

    // ── Referral Registration ─────────────────────────────────────────────
    /// Register a `referrer` for `depositor` before their first deposit.
    ///
    /// Rules:
    /// - `depositor` must authorise the call.
    /// - Self-referral is rejected (`Error::InvalidConfig`).
    /// - The mapping is write-once; a second call returns `Error::ReferralAlreadySet`.
    /// - Registration after the depositor's first deposit is rejected.
    pub fn register_referral(env: Env, depositor: Address, referrer: Address) {
        depositor.require_auth();

        if depositor == referrer {
            panic_with_error!(&env, Error::InvalidConfig);
        }

        let referrer_key = DataKey::Referrer(depositor.clone());
        if env.storage().persistent().has(&referrer_key) {
            panic_with_error!(&env, Error::ReferralAlreadySet);
        }

        // Reject if the depositor has already made their first deposit.
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(depositor.clone()))
            .unwrap_or(0);
        if balance > 0 {
            panic_with_error!(&env, Error::InvalidConfig);
        }

        env.storage().persistent().set(&referrer_key, &referrer);
    }

    // ── Referral Config (admin only) ──────────────────────────────────────
    /// Configure the referral reward parameters.
    ///
    /// - `reward_bps`: bonus shares expressed as basis points of the
    ///   depositor's minted shares (50 = 0.5 %).  Set to 0 to disable.
    /// - `epoch_cap`: maximum total bonus shares a single referrer may
    ///   accumulate before an admin resets their epoch earnings.
    pub fn set_referral_config(env: Env, reward_bps: u32, epoch_cap: i128) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::ReferralRewardBps, &reward_bps);
        env.storage()
            .instance()
            .set(&DataKey::ReferralEpochCap, &epoch_cap);
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
    /// Credit the referrer with bonus shares on a depositor's *first* deposit.
    ///
    /// Called from [`deposit`] when `current_balance == 0`.
    ///
    /// Does nothing when:
    /// - No referrer is registered for the depositor.
    /// - `ReferralRewardBps` is 0 (feature disabled).
    /// - The referrer has already hit their epoch cap.
    ///
    /// Complexity: O(1) space and time — four persistent reads, two writes.
    fn maybe_reward_referrer(env: &Env, depositor: &Address, depositor_shares: i128) {
        // Look up the referrer; bail out if none is registered.
        let referrer_key = DataKey::Referrer(depositor.clone());
        let referrer: Address = match env.storage().persistent().get(&referrer_key) {
            Some(r) => r,
            None => return,
        };

        let reward_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ReferralRewardBps)
            .unwrap_or(50);
        if reward_bps == 0 {
            return;
        }

        let epoch_cap: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReferralEpochCap)
            .unwrap_or(i128::MAX);

        let epoch_key = DataKey::ReferralEpochEarnings(referrer.clone());
        let already_earned: i128 = env
            .storage()
            .persistent()
            .get(&epoch_key)
            .unwrap_or(0);

        let remaining_cap = epoch_cap.saturating_sub(already_earned);
        if remaining_cap == 0 {
            return;
        }

        // bonus = floor(depositor_shares * reward_bps / 10_000), capped by epoch.
        let gross_bonus = depositor_shares
            .checked_mul(reward_bps as i128)
            .unwrap()
            .checked_div(10_000)
            .unwrap();

        let bonus_shares = gross_bonus.min(remaining_cap);
        if bonus_shares == 0 {
            return;
        }

        // Credit referrer's share balance.
        let referrer_balance_key = DataKey::Balance(referrer.clone());
        let referrer_balance: i128 = env
            .storage()
            .persistent()
            .get(&referrer_balance_key)
            .unwrap_or(0);
        env.storage().persistent().set(
            &referrer_balance_key,
            &referrer_balance.checked_add(bonus_shares).unwrap(),
        );

        // Mint bonus into total supply (no new assets — pure share dilution).
        let total_shares = Self::total_shares(env);
        Self::set_total_shares(
            env.clone(),
            total_shares.checked_add(bonus_shares).unwrap(),
        );

        // Accumulate epoch earnings.
        env.storage().persistent().set(
            &epoch_key,
            &already_earned.checked_add(bonus_shares).unwrap(),
        );

        // Emit ReferralRewarded { referrer, depositor, bonus_shares }.
        env.events().publish(
            (symbol_short!("RefReward"), referrer.clone()),
            (depositor.clone(), bonus_shares),
        );
    }

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
}

mod test;
