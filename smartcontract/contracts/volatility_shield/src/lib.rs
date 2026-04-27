#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
    IntoVal, Map, Symbol, TryFromVal, Val, Vec,
};

const DEFAULT_PROPOSAL_TTL_LEDGERS: u32 = 518_400;
const DAY_IN_LEDGERS: u32 = 17_280;
const BALANCE_TTL_THRESHOLD: u32 = DEFAULT_PROPOSAL_TTL_LEDGERS;
const BALANCE_TTL_BUMP: u32 = BALANCE_TTL_THRESHOLD + DAY_IN_LEDGERS;
const SHARE_PRICE_HISTORY_CAP: u32 = 365;

// ─────────────────────────────────────────────
// Error types
// ─────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Operation requires initialized contract state but `init` has not been called yet.
    NotInitialized = 1,
    /// Operation attempted to initialize state that was already initialized.
    AlreadyInitialized = 2,
    /// Numeric argument must be non-negative, but a negative value was supplied.
    NegativeAmount = 3,
    /// Caller lacks required authorization or role privileges.
    Unauthorized = 4,
    /// Operation requires at least one registered strategy, but none are configured.
    NoStrategies = 5,
    /// Operation is disabled while contract pause mode is enabled.
    ContractPaused = 6,
    /// Deposit would exceed per-user or global configured deposit caps.
    DepositCapExceeded = 7,
    /// Withdrawal would exceed configured withdrawal cap constraints.
    WithdrawalCapExceeded = 8,
    /// Oracle data is older than the configured staleness window.
    StaleOracleData = 9,
    /// Supplied timestamp is invalid (future or non-monotonic).
    InvalidTimestamp = 10,
    /// Rebalance execution exceeded the allowed slippage threshold.
    SlippageExceeded = 11,
    /// Governance proposal id does not exist in storage.
    ProposalNotFound = 12,
    /// Guardian already approved this proposal.
    AlreadyApproved = 13,
    /// Governance proposal has already been executed.
    ProposalExecuted = 14,
    /// Governance proposal has not reached required approval threshold.
    InsufficientApprovals = 15,
    /// Governance action timelock period has not elapsed yet.
    TimelockNotElapsed = 16,
    /// Requested queued withdrawal entry was not found for the user.
    WithdrawalNotFound = 17,
    /// Queue-dependent operation requires non-empty queue, but queue is empty.
    QueueEmpty = 18,
    /// Strategy allocation sum must equal 10_000 bps (or be empty) but did not.
    InvalidAllocationSum = 19,
    /// Individual strategy allocation must be non-negative.
    NegativeAllocation = 20,
    /// Allocation references a strategy not registered in the vault.
    ZeroAddressStrategy = 21,
    /// Harvest was attempted before the configured harvest interval elapsed.
    HarvestTooEarly = 22,
    /// Reentrant invocation was detected while reentrancy guard is active.
    ReentrantCall = 23,
    /// User is blocked by compliance policy (blocklist/allowlist checks).
    UserBlocked = 24,
    /// Operation is blocked while the oracle circuit breaker is active.
    CircuitBreakerActive = 25,
    /// Operation is blocked because emergency shutdown mode is active.
    EmergencyShutdownActive = 26,
}

impl Error {
    /// Returns a short machine-readable symbol for this error.
    pub fn to_symbol(&self, env: &Env) -> Symbol {
        match self {
            Error::NotInitialized => Symbol::new(env, "not_initialized"),
            Error::AlreadyInitialized => Symbol::new(env, "already_initialized"),
            Error::NegativeAmount => Symbol::new(env, "negative_amount"),
            Error::Unauthorized => Symbol::new(env, "unauthorized"),
            Error::NoStrategies => Symbol::new(env, "no_strategies"),
            Error::ContractPaused => Symbol::new(env, "contract_paused"),
            Error::DepositCapExceeded => Symbol::new(env, "deposit_cap_exceeded"),
            Error::WithdrawalCapExceeded => Symbol::new(env, "withdrawal_cap_exceeded"),
            Error::StaleOracleData => Symbol::new(env, "stale_oracle_data"),
            Error::InvalidTimestamp => Symbol::new(env, "invalid_timestamp"),
            Error::SlippageExceeded => Symbol::new(env, "slippage_exceeded"),
            Error::ProposalNotFound => Symbol::new(env, "proposal_not_found"),
            Error::AlreadyApproved => Symbol::new(env, "already_approved"),
            Error::ProposalExecuted => Symbol::new(env, "proposal_executed"),
            Error::InsufficientApprovals => Symbol::new(env, "insufficient_approvals"),
            Error::TimelockNotElapsed => Symbol::new(env, "timelock_not_elapsed"),
            Error::WithdrawalNotFound => Symbol::new(env, "withdrawal_not_found"),
            Error::QueueEmpty => Symbol::new(env, "queue_empty"),
            Error::InvalidAllocationSum => Symbol::new(env, "invalid_allocation_sum"),
            Error::NegativeAllocation => Symbol::new(env, "negative_allocation"),
            Error::ZeroAddressStrategy => Symbol::new(env, "zero_address_strategy"),
            Error::HarvestTooEarly => Symbol::new(env, "harvest_too_early"),
            Error::ReentrantCall => Symbol::new(env, "reentrant_call"),
            Error::UserBlocked => Symbol::new(env, "user_blocked"),
            Error::CircuitBreakerActive => Symbol::new(env, "circuit_breaker_active"),
            Error::EmergencyShutdownActive => Symbol::new(env, "emergency_shutdown_active"),
        }
    }
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
    EmergencyShutdown,
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
    ProposalIds,
    NextProposalId,
    ProposalTtlLedgers,
    WithdrawQueueThreshold,
    PendingWithdrawals,
    StrategyHealth(Address),
    /// Admin-configurable consecutive-failure threshold (default: 3).
    MaxConsecutiveFailures,
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
    SharePriceHistory,
    PauseHistory,
    SupportedAssets,
    Delegate(Address),
    VoteRecord(u64, Address),
    VoteTally(u64),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deposited {
    pub depositor: Address,
    pub amount: i128,
    pub shares_minted: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Withdrawn {
    pub withdrawer: Address,
    pub shares_burned: i128,
    pub amount_out: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Rebalanced {
    pub total_assets_before: i128,
    pub total_assets_after: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RebalancePartialFailure {
    pub failed_strategy: Address,
    pub reason: soroban_sdk::String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RebalanceWithdrawTransferFailed {
    pub strategy: Address,
    pub amount: i128,
}

// ─────────────────────────────────────────────
// Queued withdrawal struct
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QueuedWithdrawal {
    pub user: Address,
    pub asset: Address,
    pub shares: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    SetPaused(bool),
    AddStrategy(Address),
    Rebalance(u32),
    SetThreshold(u32),
    AddSupportedAsset(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub action: ActionType,
    pub approvals: Vec<Address>,
    pub executed: bool,
    pub executed_ledger: u32,
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
    pub consecutive_failures: u32,
}

/// Vote tally for a governance proposal.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteTally {
    pub yes_votes: i128,
    pub no_votes: i128,
}

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

    pub fn try_deposit(&self, amount: i128) -> Result<(), soroban_sdk::String> {
        let res = self.env.try_invoke_contract::<(), soroban_sdk::Error>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "deposit"),
            soroban_sdk::vec![self.env, soroban_sdk::IntoVal::into_val(&amount, self.env)],
        );
        match res {
            Ok(Ok(())) => Ok(()),
            _ => Err(soroban_sdk::String::from_str(self.env, "deposit failed")),
        }
    }

    pub fn withdraw(&self, amount: i128) {
        self.env.invoke_contract::<()>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "withdraw"),
            soroban_sdk::vec![self.env, soroban_sdk::IntoVal::into_val(&amount, self.env)],
        );
    }

    pub fn try_withdraw(&self, amount: i128) -> Result<(), soroban_sdk::String> {
        let res = self.env.try_invoke_contract::<(), soroban_sdk::Error>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "withdraw"),
            soroban_sdk::vec![self.env, soroban_sdk::IntoVal::into_val(&amount, self.env)],
        );
        match res {
            Ok(Ok(())) => Ok(()),
            _ => Err(soroban_sdk::String::from_str(self.env, "withdraw failed")),
        }
    }

    pub fn balance(&self) -> i128 {
        self.env.invoke_contract::<i128>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "balance"),
            soroban_sdk::vec![self.env],
        )
    }

    pub fn try_balance(&self) -> Result<i128, soroban_sdk::String> {
        let res = self.env.try_invoke_contract::<i128, soroban_sdk::Error>(
            &self.address,
            &soroban_sdk::Symbol::new(self.env, "balance"),
            soroban_sdk::vec![self.env],
        );
        match res {
            Ok(Ok(val)) => Ok(val),
            _ => Err(soroban_sdk::String::from_str(self.env, "balance failed")),
        }
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

impl VolatilityShield {
    fn emit_error(env: &Env, error: Error) {
        env.events()
            .publish((Symbol::new(env, "Error"), error.to_symbol(env)), ());
    }

    fn emit_and_err<T>(env: &Env, error: Error) -> Result<T, Error> {
        Self::emit_error(env, error);
        Err(error)
    }

    fn balance_deviation_amount(actual_balance: i128, expected_balance: i128) -> i128 {
        // Avoid `abs(i128::MIN)`, which can panic in debug builds.
        actual_balance
            .saturating_sub(expected_balance)
            .max(expected_balance.saturating_sub(actual_balance))
    }

    fn bump_instance_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(BALANCE_TTL_THRESHOLD, BALANCE_TTL_BUMP);
    }

    fn bump_persistent_ttl(env: &Env, key: &DataKey) {
        Self::bump_instance_ttl(env);
        env.storage()
            .persistent()
            .extend_ttl(key, BALANCE_TTL_THRESHOLD, BALANCE_TTL_BUMP);
    }

    fn get_persistent<T>(env: &Env, key: &DataKey) -> Option<T>
    where
        T: TryFromVal<Env, Val>,
        T::Error: core::fmt::Debug,
    {
        let value = env.storage().persistent().get(key);
        if value.is_some() {
            Self::bump_persistent_ttl(env, key);
        }
        value
    }

    fn set_persistent<T>(env: &Env, key: &DataKey, value: &T)
    where
        T: IntoVal<Env, Val>,
    {
        env.storage().persistent().set(key, value);
        Self::bump_persistent_ttl(env, key);
    }

    fn read_user_balance(env: &Env, user: &Address) -> i128 {
        let balance_key = DataKey::Balance(user.clone());
        Self::get_persistent(env, &balance_key).unwrap_or(0)
    }

    fn write_user_balance(env: &Env, user: &Address, amount: i128) {
        let balance_key = DataKey::Balance(user.clone());
        Self::set_persistent(env, &balance_key, &amount);
    }

    fn read_asset_balance(env: &Env, asset: &Address, user: &Address) -> i128 {
        let asset_balance_key = DataKey::AssetBalance(asset.clone(), user.clone());
        Self::get_persistent(env, &asset_balance_key).unwrap_or(0)
    }

    fn write_asset_balance(env: &Env, asset: &Address, user: &Address, amount: i128) {
        let asset_balance_key = DataKey::AssetBalance(asset.clone(), user.clone());
        Self::set_persistent(env, &asset_balance_key, &amount);
    }

    fn read_delegate(env: &Env, owner: &Address) -> Option<Address> {
        let delegate_key = DataKey::Delegate(owner.clone());
        Self::get_persistent(env, &delegate_key)
    }

    fn write_delegate(env: &Env, owner: &Address, delegate: &Address) {
        let delegate_key = DataKey::Delegate(owner.clone());
        Self::set_persistent(env, &delegate_key, delegate);
    }

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
}

#[contractimpl]
impl VolatilityShield {
    /// Propose a new governance action.
    ///
    /// This is the first step in the multisig/timelock process.
    /// Only guardians can propose actions.
    pub fn propose_action(env: Env, proposer: Address, action: ActionType) -> Result<u64, Error> {
        if Self::emergency_shutdown_active(&env) {
            return Self::emit_and_err(&env, Error::EmergencyShutdownActive);
        }
        let _guard = Guard::new(&env);
        proposer.require_auth();

        let guardians: Vec<Address> = env.storage().instance().get(&DataKey::Guardians).unwrap();
        if !guardians.contains(proposer.clone()) {
            return Self::emit_and_err(&env, Error::Unauthorized);
        }

        Self::prune_old_proposals_internal(&env);

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
            approvals: soroban_sdk::vec![&env, proposer.clone()],
            executed: false,
            executed_ledger: 0,
            proposed_at,
        };

        // Emit Governance events
        env.events()
            .publish((soroban_sdk::Symbol::new(&env, "ProposalCreated"),), id);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "TimelockStarted"),),
            (id, proposed_at),
        );

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);
        if threshold <= 1 {
            // Try to execute, but if timelock hasn't elapsed, the proposal will remain unexecuted
            let res = Self::execute_action(&env, &proposer, &action, proposed_at);
            if let Err(e) = res {
                if e != Error::TimelockNotElapsed {
                    return Err(e);
                }
            } else {
                proposal.executed = true;
                proposal.executed_ledger = env.ledger().sequence();
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
        let mut proposal_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ProposalIds)
            .unwrap_or(Vec::new(&env));
        proposal_ids.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::ProposalIds, &proposal_ids);

        Ok(id)
    }

    /// Approve a pending governance proposal.
    ///
    /// If the approval threshold is reached, the action is executed.
    /// Guardians cannot approve the same proposal twice.
    pub fn approve_action(env: Env, guardian: Address, proposal_id: u64) -> Result<(), Error> {
        let _guard = Guard::new(&env);
        guardian.require_auth();

        let guardians: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Guardians)
            .ok_or(Error::NotInitialized)?;
        if !guardians.contains(guardian.clone()) {
            return Self::emit_and_err(&env, Error::Unauthorized);
        }

        Self::prune_old_proposals_internal(&env);

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .ok_or(Error::NotInitialized)?;
        let mut proposal = proposals.get(proposal_id).ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Self::emit_and_err(&env, Error::ProposalExecuted);
        }

        if proposal.approvals.contains(guardian.clone()) {
            return Self::emit_and_err(&env, Error::AlreadyApproved);
        }

        proposal.approvals.push_back(guardian.clone());

        // Emit ProposalApproved event
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "ProposalApproved"),
                proposal_id,
            ),
            guardian.clone(),
        );

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);
        if proposal.approvals.len() >= threshold {
            Self::execute_action(&env, &guardian, &proposal.action, proposal.proposed_at)?;
            proposal.executed = true;
            proposal.executed_ledger = env.ledger().sequence();
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
            Self::read_user_balance(&env, &user)
        }
    }

    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        support: bool,
    ) -> Result<(), Error> {
        voter.require_auth();

        // Proposal must exist and not be executed
        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .ok_or(Error::NotInitialized)?;
        let proposal = proposals.get(proposal_id).ok_or(Error::ProposalNotFound)?;
        if proposal.executed {
            return Err(Error::ProposalExecuted);
        }

        // Each address may only vote once per proposal
        let vote_key = DataKey::VoteRecord(proposal_id, voter.clone());
        if env.storage().instance().has(&vote_key) {
            return Err(Error::AlreadyApproved);
        }
        env.storage().instance().set(&vote_key, &true);

        // Tally the vote, weighted by voting power
        let voting_power = Self::get_voting_power(env.clone(), voter.clone());
        let tally_key = DataKey::VoteTally(proposal_id);
        let mut tally: VoteTally = env
            .storage()
            .instance()
            .get(&tally_key)
            .unwrap_or(VoteTally {
                yes_votes: 0,
                no_votes: 0,
            });

        if support {
            tally.yes_votes = tally
                .yes_votes
                .checked_add(voting_power)
                .unwrap_or(i128::MAX);
        } else {
            tally.no_votes = tally
                .no_votes
                .checked_add(voting_power)
                .unwrap_or(i128::MAX);
        }
        env.storage().instance().set(&tally_key, &tally);

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "VoteCast"), voter),
            (proposal_id, support, voting_power),
        );

        Ok(())
    }

    /// Get the current vote tally for a proposal.
    pub fn get_vote_tally(env: Env, proposal_id: u64) -> VoteTally {
        env.storage()
            .instance()
            .get(&DataKey::VoteTally(proposal_id))
            .unwrap_or(VoteTally {
                yes_votes: 0,
                no_votes: 0,
            })
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
            return Self::emit_and_err(&env, Error::Unauthorized);
        }
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
        env.events()
            .publish((symbol_short!("Threshold"),), threshold);
        Ok(())
    }

    fn execute_action(
        env: &Env,
        _caller: &Address,
        action: &ActionType,
        proposed_at: u64,
    ) -> Result<(), Error> {
        // Check if timelock has elapsed
        Self::assert_timelock_elapsed(env, proposed_at)?;
        match action {
            ActionType::SetPaused(state) => {
                Self::record_pause_change(env, env.current_contract_address(), *state);
            }
            ActionType::AddStrategy(strategy) => {
                Self::internal_add_strategy(env, strategy.clone())?;
            }
            ActionType::Rebalance(max_slippage) => {
                Self::internal_rebalance(env, _caller, *max_slippage)?;
            }
            ActionType::SetThreshold(threshold) => {
                env.storage().instance().set(&DataKey::Threshold, threshold);
            }
            ActionType::AddSupportedAsset(asset) => {
                Self::add_supported_asset(env.clone(), asset.clone());
            }
        }

        // Emit TimelockExecuted event
        env.events()
            .publish((soroban_sdk::Symbol::new(&env, "ProposalExecuted"),), ());
        env.events()
            .publish((soroban_sdk::Symbol::new(&env, "TimelockExecuted"),), ());

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
            return Self::emit_and_err(env, Error::TimelockNotElapsed);
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
            return Self::emit_and_err(&env, Error::AlreadyInitialized);
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
        env.storage()
            .instance()
            .set(&DataKey::EmergencyShutdown, &false);

        // Initialize maps and durations
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &Map::<u64, Proposal>::new(&env));
        env.storage()
            .instance()
            .set(&DataKey::ProposalIds, &Vec::<u64>::new(&env));
        env.storage()
            .instance()
            .set(&DataKey::TimelockDuration, &0_u64);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &1_u64);

        // Multi-asset initialization
        let mut supported = Vec::new(&env);
        supported.push_back(asset.clone());
        env.storage()
            .instance()
            .set(&DataKey::SupportedAssets, &supported);

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

        Self::bump_instance_ttl(&env);

        Ok(())
    }

    /// Returns the share price history snapshots for the vault.
    pub fn get_share_price_history(env: Env) -> Vec<(u64, i128)> {
        env.storage()
            .instance()
            .get(&DataKey::SharePriceHistory)
            .unwrap_or(Vec::new(&env))
    }

    /// Returns the pause/unpause history for the vault.
    pub fn get_pause_history(env: Env) -> Vec<(u64, Address, bool)> {
        env.storage()
            .instance()
            .get(&DataKey::PauseHistory)
            .unwrap_or(Vec::new(&env))
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
    /// @param min_shares_out Optional minimum acceptable shares to mint.
    pub fn deposit(
        env: Env,
        from: Address,
        asset: Address,
        amount: i128,
        _min_shares_out: Option<i128>,
    ) -> Result<(), Error> {
        let _guard = Guard::new(&env);
        Self::check_version(&env, 1);
        Self::assert_not_emergency_shutdown(&env);
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
        if !Self::is_supported_asset(env.clone(), asset.clone()) {
            panic!("unsupported asset");
        }

        let price = Self::get_asset_price(env.clone(), asset.clone());
        let value_deposited = amount
            .checked_mul(price)
            .unwrap()
            .checked_div(1_000_000_000)
            .unwrap();

        // ── Checks ───────────────────────────────────────────────────────────
        // Compute shares using pre-deposit totals so the ratio is not skewed.
        let shares_to_mint = Self::convert_to_shares(env.clone(), value_deposited);

        // Slippage check
        if let Some(min_shares) = _min_shares_out {
            if shares_to_mint < min_shares {
                return Self::emit_and_err(&env, Error::SlippageExceeded);
            }
        }

        // Track per-asset user balance
        let current_asset_balance = Self::read_asset_balance(&env, &asset, &from);
        let new_asset_balance = current_asset_balance.checked_add(shares_to_mint).unwrap();

        // Also track total user balance (for backward compatibility)
        let current_balance = Self::read_user_balance(&env, &from);
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

        let total_assets_value = Self::total_assets(&env);
        let new_total_assets_value = total_assets_value.checked_add(value_deposited).unwrap();

        let max_total_assets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxTotalAssets)
            .unwrap_or(i128::MAX);
        if new_total_assets_value > max_total_assets {
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "DepositCapExceeded"),),
                amount,
            );
            panic!("DepositCapExceeded: global deposit cap exceeded");
        }
        // -------------------------------

        // ── Effects ──────────────────────────────────────────────────────────
        // Commit all state mutations before touching external contracts (CEI).

        // Update per-asset balance
        Self::write_asset_balance(&env, &asset, &from, new_asset_balance);

        // Update total user balance
        Self::write_user_balance(&env, &from, new_user_balance);

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

        Self::set_total_shares(env.clone(), new_total_shares);
        env.storage()
            .instance()
            .set(&DataKey::TotalAssets, &new_total_assets_value);

        // ── Interaction ───────────────────────────────────────────────────────
        // Token transfer occurs last, after all state is committed (CEI pattern).
        token::Client::new(&env, &asset).transfer(&from, &env.current_contract_address(), &amount);

        let share_price = Self::get_share_price(&env);

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "Deposited"), from.clone()),
            (
                Deposited {
                    depositor: from.clone(),
                    amount,
                    shares_minted: shares_to_mint,
                },
                share_price,
                new_total_assets_value,
                new_total_shares,
            ),
        );

        Ok(())
    }

    // ── Batch Deposit ─────────────────────────
    /// Process multiple deposit operations in a single transaction.
    ///
    /// Validates each operation independently. Failed operations are skipped and do not revert the batch.
    pub fn batch_deposit(env: Env, operations: Vec<(Address, Address, i128)>) -> Vec<bool> {
        Self::check_version(&env, 1);
        Self::assert_not_emergency_shutdown(&env);
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

            if !Self::is_supported_asset(env.clone(), asset.clone()) {
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

            let price = Self::get_asset_price(env.clone(), asset.clone());
            let value_deposited = amount
                .checked_mul(price)
                .unwrap()
                .checked_div(1_000_000_000)
                .unwrap();
            let shares_to_mint = Self::convert_to_shares(env.clone(), value_deposited);

            let current_asset_balance = Self::read_asset_balance(&env, &asset, &from);
            let current_balance = Self::read_user_balance(&env, &from);
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

            let total_assets_value = Self::total_assets(&env);
            let new_total_assets_value = total_assets_value.checked_add(value_deposited).unwrap();

            let max_total_assets: i128 = env
                .storage()
                .instance()
                .get(&DataKey::MaxTotalAssets)
                .unwrap_or(i128::MAX);
            if new_total_assets_value > max_total_assets {
                env.events().publish(
                    (symbol_short!("BatchDep"), symbol_short!("Fail")),
                    (from.clone(), asset.clone(), amount, symbol_short!("GlbCap")),
                );
                results.push_back(false);
                continue;
            }

            // ── Effects: commit all state before external call (CEI) ──────────
            Self::write_asset_balance(&env, &asset, &from, current_asset_balance + shares_to_mint);
            Self::write_user_balance(&env, &from, new_user_balance);

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
            env.storage()
                .instance()
                .set(&DataKey::TotalAssets, &new_total_assets_value);

            // ── Interaction: token transfer last ──────────────────────────────
            token::Client::new(&env, &asset).transfer(
                &from,
                &env.current_contract_address(),
                &amount,
            );

            let share_price = Self::get_share_price(&env);

            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "Deposited"), from.clone()),
                (
                    Deposited {
                        depositor: from.clone(),
                        amount,
                        shares_minted: shares_to_mint,
                    },
                    share_price,
                    new_total_assets_value,
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
    /// @param caller The owner or approved delegate authorizing the withdrawal.
    /// @param from The address of the user withdrawing.
    /// @param asset The address of the asset to withdraw.
    /// @param shares The amount of shares to burn.
    pub fn withdraw(
        env: Env,
        caller: Address,
        from: Address,
        asset: Address,
        shares: i128,
    ) -> Result<(), Error> {
        let _guard = Guard::new(&env);
        Self::check_version(&env, 1);
        Self::assert_not_paused(&env);
        if shares <= 0 {
            panic!("shares to withdraw must be positive");
        }
        Self::require_owner_or_delegate(&env, &from, &caller);

        let current_balance = Self::read_user_balance(&env, &from);

        if current_balance < shares {
            panic!("insufficient shares for withdrawal");
        }

        if !Self::is_supported_asset(env.clone(), asset.clone()) {
            panic!("unsupported asset");
        }

        let assets_to_withdraw_value = Self::convert_to_assets(env.clone(), shares);
        let asset_price = Self::get_asset_price(env.clone(), asset.clone());
        let token_units_to_withdraw = assets_to_withdraw_value
            .checked_mul(1_000_000_000)
            .unwrap()
            .checked_div(asset_price)
            .unwrap();

        // --- Withdraw Caps Validation ---
        let max_withdraw_per_tx: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxWithdrawPerTx)
            .unwrap_or(i128::MAX);
        if assets_to_withdraw_value > max_withdraw_per_tx {
            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "WithdrawCapExceeded"),),
                assets_to_withdraw_value,
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
        if assets_to_withdraw_value > queue_threshold {
            // Queue the withdrawal instead of processing immediately
            Self::internal_queue_withdraw(env.clone(), from, asset, shares);
            return Ok(());
        }

        let total_shares = Self::total_shares(&env);
        let total_assets_value = Self::total_assets(&env);

        let new_total_shares = total_shares.checked_sub(shares).unwrap();
        let new_total_assets_value = total_assets_value
            .checked_sub(assets_to_withdraw_value)
            .unwrap();
        let new_user_balance = current_balance.checked_sub(shares).unwrap();

        Self::set_total_shares(env.clone(), new_total_shares);

        // Update per-asset accounting
        let asset_total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AssetTotalAssets(asset.clone()))
            .unwrap_or(0);
        env.storage().instance().set(
            &DataKey::AssetTotalAssets(asset.clone()),
            &(asset_total - token_units_to_withdraw),
        );
        env.storage()
            .instance()
            .set(&DataKey::TotalAssets, &new_total_assets_value);

        Self::write_user_balance(&env, &from, new_user_balance);

        // Update per-asset user balance
        let current_asset_balance = Self::read_asset_balance(&env, &asset, &from);
        Self::write_asset_balance(
            &env,
            &asset,
            &from,
            current_asset_balance.saturating_sub(shares),
        );

        let share_price = Self::get_share_price(&env);

        token::Client::new(&env, &asset).transfer(
            &env.current_contract_address(),
            &from,
            &token_units_to_withdraw,
        );

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "Withdrawn"), from.clone()),
            Withdrawn {
                withdrawer: from,
                shares_burned: shares,
                amount_out: assets_to_withdraw_value,
            },
        );

        Ok(())
    }

    // ── Batch Withdraw ─────────────────────────
    /// Process multiple withdraw operations in a single transaction.
    ///
    /// Validates each operation independently. Failed operations are skipped and do not revert the batch.
    pub fn batch_withdraw(env: Env, operations: Vec<(Address, Address, i128)>) -> Vec<bool> {
        Self::check_version(&env, 1);
        Self::assert_not_paused(&env);
        Self::require_admin(&env);

        let mut results = Vec::new(&env);

        for op in operations.iter() {
            let (from, asset, shares) = op;

            if shares <= 0 {
                env.events().publish(
                    (symbol_short!("BatchWd"), symbol_short!("Fail")),
                    (from.clone(), shares, symbol_short!("Zero")),
                );
                results.push_back(false);
                continue;
            }

            if !Self::is_supported_asset(env.clone(), asset.clone()) {
                env.events().publish(
                    (symbol_short!("BatchWd"), symbol_short!("Fail")),
                    (from.clone(), shares, symbol_short!("BadAsset")),
                );
                results.push_back(false);
                continue;
            }

            let current_balance = Self::read_user_balance(&env, &from);

            if current_balance < shares {
                env.events().publish(
                    (symbol_short!("BatchWd"), symbol_short!("Fail")),
                    (from.clone(), shares, symbol_short!("Insuf")),
                );
                results.push_back(false);
                continue;
            }

            let assets_to_withdraw_value = Self::convert_to_assets(env.clone(), shares);
            let asset_price = Self::get_asset_price(env.clone(), asset.clone());
            let token_units_to_withdraw = assets_to_withdraw_value
                .checked_mul(1_000_000_000)
                .unwrap()
                .checked_div(asset_price)
                .unwrap();

            let max_withdraw_per_tx: i128 = env
                .storage()
                .instance()
                .get(&DataKey::MaxWithdrawPerTx)
                .unwrap_or(i128::MAX);
            if assets_to_withdraw_value > max_withdraw_per_tx {
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
            if assets_to_withdraw_value > queue_threshold {
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
                    asset: asset.clone(),
                    shares,
                    timestamp: env.ledger().timestamp(),
                };

                let new_user_balance = current_balance.checked_sub(shares).unwrap();
                Self::write_user_balance(&env, &from, new_user_balance);

                // Update per-asset user balance
                let current_asset_balance = Self::read_asset_balance(&env, &asset, &from);
                Self::write_asset_balance(
                    &env,
                    &asset,
                    &from,
                    current_asset_balance.saturating_sub(shares),
                );

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
                    (
                        asset.clone(),
                        shares,
                        share_price,
                        total_assets,
                        total_shares,
                    ),
                );

                results.push_back(true);
                continue;
            }

            let total_shares = Self::total_shares(&env);
            let total_assets_value = Self::total_assets(&env);

            let new_total_shares = total_shares.checked_sub(shares).unwrap();
            let new_total_assets_value = total_assets_value
                .checked_sub(assets_to_withdraw_value)
                .unwrap();
            let new_user_balance = current_balance.checked_sub(shares).unwrap();

            Self::set_total_shares(env.clone(), new_total_shares);

            let asset_total: i128 = env
                .storage()
                .instance()
                .get(&DataKey::AssetTotalAssets(asset.clone()))
                .unwrap_or(0);
            env.storage().instance().set(
                &DataKey::AssetTotalAssets(asset.clone()),
                &(asset_total - token_units_to_withdraw),
            );
            env.storage()
                .instance()
                .set(&DataKey::TotalAssets, &new_total_assets_value);

            Self::write_user_balance(&env, &from, new_user_balance);

            // Update per-asset user balance
            let current_asset_balance = Self::read_asset_balance(&env, &asset, &from);
            Self::write_asset_balance(
                &env,
                &asset,
                &from,
                current_asset_balance.saturating_sub(shares),
            );

            let share_price = Self::get_share_price(&env);

            token::Client::new(&env, &asset).transfer(
                &env.current_contract_address(),
                &from,
                &token_units_to_withdraw,
            );

            env.events().publish(
                (soroban_sdk::Symbol::new(&env, "Withdrawn"), from.clone()),
                Withdrawn {
                    withdrawer: from.clone(),
                    shares_burned: shares,
                    amount_out: assets_to_withdraw_value,
                },
            );

            results.push_back(true);
        }
        results
    }

    // ── Withdrawal Queue ───────────────────────
    /// Queue a withdrawal request for processing later.
    ///
    /// This is called automatically by withdraw() when the amount exceeds the threshold.
    /// @param caller The owner or approved delegate authorizing the queue request.
    /// @param from The address of the user withdrawing.
    /// @param asset The address of the asset being withdrawn.
    /// @param shares The amount of shares to burn.
    pub fn queue_withdraw(env: Env, caller: Address, from: Address, asset: Address, shares: i128) {
        let _guard = Guard::new(&env);
        Self::assert_not_paused(&env);
        if shares <= 0 {
            panic!("shares to queue must be positive");
        }
        Self::require_owner_or_delegate(&env, &from, &caller);
        Self::internal_queue_withdraw(env.clone(), from, asset, shares);
    }

    fn internal_queue_withdraw(env: Env, from: Address, asset: Address, shares: i128) {
        let current_balance = Self::read_user_balance(&env, &from);

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
            asset: asset.clone(),
            shares,
            timestamp: env.ledger().timestamp(),
        };

        // Subtract shares from user balance immediately to prevent double-spending/inflation
        let new_user_balance = current_balance.checked_sub(shares).unwrap();
        Self::write_user_balance(&env, &from, new_user_balance);

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
            (
                asset.clone(),
                shares,
                share_price,
                total_assets,
                total_shares,
            ),
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
        let current_balance = Self::read_user_balance(&env, &from);
        Self::write_user_balance(&env, &from, current_balance + w.shares);

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

    /// Approve a delegate that may execute withdrawals on behalf of `owner`.
    pub fn set_delegate(env: Env, owner: Address, delegate: Address) {
        owner.require_auth();
        Self::write_delegate(&env, &owner, &delegate);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "DelegateSet"),),
            (owner, delegate),
        );
    }

    /// Remove the approved delegate for `owner`.
    pub fn remove_delegate(env: Env, owner: Address) {
        owner.require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Delegate(owner.clone()));
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "DelegateRemoved"),),
            (owner,),
        );
    }

    /// Return the approved delegate for `owner`, if one is set.
    pub fn get_delegate(env: Env, owner: Address) -> Option<Address> {
        Self::read_delegate(&env, &owner)
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
    fn internal_rebalance(
        env: &Env,
        caller: &Address,
        max_slippage_bps: u32,
    ) -> Result<u32, Error> {
        Self::check_version(env, 1);
        if Self::emergency_shutdown_active(env) {
            return Self::emit_and_err(env, Error::EmergencyShutdownActive);
        }
        let admin = Self::read_admin(env);
        let oracle = Self::get_oracle(env);

        // OR-auth: require that either Admin or Oracle authorised this invocation.
        Self::require_admin_or_oracle(env, caller, &admin, &oracle);

        // Check if circuit breaker is active
        let circuit_breaker_active: bool = env
            .storage()
            .instance()
            .get(&DataKey::OracleCircuitBreakerActive)
            .unwrap_or(false);

        if circuit_breaker_active {
            return Self::emit_and_err(env, Error::CircuitBreakerActive);
        }

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
                return Self::emit_and_err(env, Error::StaleOracleData);
            }

            env.storage()
                .instance()
                .get(&DataKey::TargetAllocations)
                .ok_or(Error::NotInitialized)?
        };

        let asset_addr = Self::get_asset(&env);
        let token_client = token::Client::new(&env, &asset_addr);
        let vault = env.current_contract_address();

        let mut initial_balances: Map<Address, i128> = Map::new(&env);
        let total_assets = Self::total_assets(env);
        let mut successful_strategies: u32 = 0;

        // Execute rebalance operations
        for (strategy_addr, bps_allocation) in allocations.iter() {
            let strategy = StrategyClient::new(&env, strategy_addr.clone());

            let current_balance = match strategy.try_balance() {
                Ok(bal) => bal,
                Err(reason) => {
                    let _ = Self::flag_strategy(env.clone(), strategy_addr.clone());
                    env.events().publish(
                        (
                            soroban_sdk::Symbol::new(env, "RebalancePartialFailure"),
                            strategy_addr.clone(),
                        ),
                        RebalancePartialFailure {
                            failed_strategy: strategy_addr.clone(),
                            reason,
                        },
                    );
                    continue;
                }
            };

            initial_balances.set(strategy_addr.clone(), current_balance);

            // Convert BPS to absolute target allocation
            let target_allocation = total_assets
                .checked_mul(bps_allocation)
                .unwrap()
                .checked_div(10_000)
                .unwrap_or(0);

            let mut op_success = true;

            if target_allocation > current_balance {
                // Vault → Strategy (CEI: confirm strategy accepts before transferring tokens)
                let diff = target_allocation - current_balance;
                match strategy.try_deposit(diff) {
                    Ok(_) => {
                        // Strategy accepted the deposit; now transfer tokens to back it.
                        token_client.transfer(&vault, &strategy_addr, &diff);
                    }
                    Err(reason) => {
                        let _ = Self::flag_strategy(env.clone(), strategy_addr.clone());
                        env.events().publish(
                            (
                                soroban_sdk::Symbol::new(env, "RebalancePartialFailure"),
                                strategy_addr.clone(),
                            ),
                            RebalancePartialFailure {
                                failed_strategy: strategy_addr.clone(),
                                reason,
                            },
                        );
                        op_success = false;
                    }
                }
            } else if target_allocation < current_balance {
                // Strategy → Vault
                let diff = current_balance - target_allocation;
                if let Err(reason) = strategy.try_withdraw(diff) {
                    let _ = Self::flag_strategy(env.clone(), strategy_addr.clone());
                    env.events().publish(
                        (
                            soroban_sdk::Symbol::new(env, "RebalancePartialFailure"),
                            strategy_addr.clone(),
                        ),
                        RebalancePartialFailure {
                            failed_strategy: strategy_addr.clone(),
                            reason,
                        },
                    );
                    op_success = false;
                } else {
                    // Strategy withdrew successfully; now pull the tokens into the vault.
                    // Use try_transfer so a transfer failure is caught and handled rather
                    // than leaving vault accounting inconsistent with actual balances.
                    match token_client.try_transfer(&strategy_addr, &vault, &diff) {
                        Ok(_) => {}
                        Err(_) => {
                            // Tokens didn't arrive — re-deposit to restore strategy balance,
                            // then emit an alert event for off-chain monitoring.
                            let _ = strategy.try_deposit(diff);
                            env.events().publish(
                                (
                                    soroban_sdk::Symbol::new(
                                        env,
                                        "RebalanceWithdrawTransferFailed",
                                    ),
                                    strategy_addr.clone(),
                                ),
                                RebalanceWithdrawTransferFailed {
                                    strategy: strategy_addr.clone(),
                                    amount: diff,
                                },
                            );
                            op_success = false;
                        }
                    }
                }
            }

            if op_success {
                successful_strategies += 1;
            }
        }

        // Verify slippage after all operations
        for (strategy_addr, target_allocation) in allocations.iter() {
            if !initial_balances.contains_key(strategy_addr.clone()) {
                continue;
            }
            let strategy = StrategyClient::new(&env, strategy_addr.clone());
            let final_balance = match strategy.try_balance() {
                Ok(bal) => bal,
                Err(_) => continue,
            };
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
                    return Self::emit_and_err(&env, Error::SlippageExceeded);
                }
            }
        }

        let total_assets_before = total_assets;
        let final_total_assets = Self::total_assets(env);

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "Rebalanced"),),
            Rebalanced {
                total_assets_before,
                total_assets_after: final_total_assets,
            },
        );
        Self::record_share_price_snapshot(env);

        Ok(successful_strategies)
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
            return Self::emit_and_err(&env, Error::InvalidTimestamp);
        }

        let last_timestamp = env
            .storage()
            .instance()
            .get(&DataKey::OracleLastUpdate)
            .unwrap_or(0u64);
        if timestamp <= last_timestamp {
            return Self::emit_and_err(&env, Error::InvalidTimestamp);
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
                return Self::emit_and_err(env, Error::ZeroAddressStrategy);
            }

            // Guard 2: individual allocation must be non-negative.
            if allocation < 0 {
                return Self::emit_and_err(env, Error::NegativeAllocation);
            }

            // Accumulate; saturate at i128::MAX on overflow (caught by sum check below).
            total_bps = total_bps.checked_add(allocation).unwrap_or(i128::MAX);
        }

        // Guard 3: non-empty allocations must sum exactly to 100% (10 000 bps).
        // An empty map (total_bps == 0) is allowed for initialization / reset.
        if total_bps != 0 && total_bps != 10_000 {
            return Self::emit_and_err(env, Error::InvalidAllocationSum);
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
    /// Internal: add a strategy after it has passed the multi-sig proposal flow.
    ///
    /// This function is ONLY reachable via `execute_action(ActionType::AddStrategy(...))`,
    /// which itself requires a guardian proposal + threshold approvals + timelock.
    /// Direct admin calls are intentionally not possible — the two-step governance
    /// approval is the sole entry point, satisfying the whitelist requirement.
    fn internal_add_strategy(env: &Env, strategy: Address) -> Result<(), Error> {
        Self::check_version(env, 1);
        // No require_admin here — access is enforced by the proposal/approval flow above.

        let mut strategies: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Strategies)
            .unwrap_or(Vec::new(&env));
        if strategies.contains(strategy.clone()) {
            return Self::emit_and_err(env, Error::AlreadyInitialized);
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
            consecutive_failures: 0,
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
                return Self::emit_and_err(&env, Error::HarvestTooEarly);
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
            return Self::emit_and_err(&env, Error::NoStrategies);
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
            let mut history: YieldHistory =
                env.storage()
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
            let mut history: YieldHistory =
                env.storage()
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
        Self::record_share_price_snapshot(&env);
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
            return Self::emit_and_err(&env, Error::NoStrategies);
        }

        let _max_failures: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxConsecutiveFailures)
            .unwrap_or(3);

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
            let mut current_health: StrategyHealth = env
                .storage()
                .instance()
                .get(&health_key)
                .unwrap_or(StrategyHealth {
                    last_known_balance: expected_balance,
                    last_check_timestamp: current_time,
                    is_healthy: true,
                    consecutive_failures: 0,
                });

            // Get max consecutive failures threshold
            let max_failures: u32 = env
                .storage()
                .instance()
                .get(&DataKey::MaxConsecutiveFailures)
                .unwrap_or(3);

            // Check if strategy is unhealthy (significant deviation from expected)
            let balance_deviation = if expected_balance > 0 {
                // Allow 10% deviation before flagging as unhealthy
                let deviation_threshold = expected_balance.checked_div(10).unwrap_or(0);
                Self::balance_deviation_amount(actual_balance, expected_balance)
                    > deviation_threshold
            } else {
                // If expected is 0, any positive actual balance is considered healthy
                false
            };

            let currently_failed = balance_deviation;
            let mut consecutive_failures = current_health.consecutive_failures;
            let mut is_healthy = current_health.is_healthy;

            if currently_failed {
                consecutive_failures += 1;
                if consecutive_failures >= max_failures {
                    is_healthy = false;
                    // Auto-flag event
                    env.events().publish(
                        (symbol_short!("StrategyF"), strategy_addr.clone()),
                        current_time,
                    );
                }
            } else {
                consecutive_failures = 0;
                // Note: We don't automatically set is_healthy = true here if it was false.
                // Re-enabling a strategy usually requires manual administrative review
                // or a specific recovery process. But as per requirements:
                // "Reset counter to 0 on a successful balance check"
                // "A single recovery resets the counter"
            }

            // Update health data if changed
            if is_healthy != current_health.is_healthy
                || consecutive_failures != current_health.consecutive_failures
                || actual_balance != current_health.last_known_balance
            {
                current_health = StrategyHealth {
                    last_known_balance: actual_balance,
                    last_check_timestamp: current_time,
                    is_healthy,
                    consecutive_failures,
                };
                env.storage().instance().set(&health_key, &current_health);
            }

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
            return Self::emit_and_err(&env, Error::NotInitialized);
        }

        let health_key = DataKey::StrategyHealth(strategy.clone());
        let current_time = env.ledger().timestamp();

        // Update health to unhealthy, preserving the existing counter
        let existing: StrategyHealth =
            env.storage()
                .instance()
                .get(&health_key)
                .unwrap_or(StrategyHealth {
                    last_known_balance: 0,
                    last_check_timestamp: current_time,
                    is_healthy: true,
                    consecutive_failures: 0,
                });
        let updated_health = StrategyHealth {
            last_known_balance: existing.last_known_balance,
            last_check_timestamp: current_time,
            is_healthy: false,
            consecutive_failures: 0,
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
            return Self::emit_and_err(&env, Error::NotInitialized);
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

    /// Set the number of consecutive failed balance checks before a strategy is
    /// auto-flagged as unhealthy.  Defaults to 3 when not configured.
    /// Only the admin can call this.
    pub fn set_max_consecutive_failures(env: Env, threshold: u32) -> Result<(), Error> {
        Self::require_admin(&env);
        if threshold == 0 {
            return Err(Error::NegativeAmount);
        }
        env.storage()
            .instance()
            .set(&DataKey::MaxConsecutiveFailures, &threshold);
        env.events().publish((symbol_short!("MaxFail"),), threshold);
        Ok(())
    }

    /// Return the currently configured consecutive-failure threshold (default: 3).
    pub fn get_max_consecutive_failures(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::MaxConsecutiveFailures)
            .unwrap_or(3)
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
                let growth = end_balance
                    .checked_mul(10_000)
                    .unwrap()
                    .checked_div(start_balance)
                    .unwrap();
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
        let supported: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .unwrap_or(Vec::new(env));
        let mut total_value: i128 = 0;
        for asset in supported.iter() {
            let asset_quantity: i128 = env
                .storage()
                .instance()
                .get(&DataKey::AssetTotalAssets(asset.clone()))
                .unwrap_or(0);
            let price = Self::get_asset_price(env.clone(), asset.clone());
            let value = asset_quantity
                .checked_mul(price)
                .unwrap_or(0)
                .checked_div(1_000_000_000)
                .unwrap_or(0);
            total_value = total_value.checked_add(value).unwrap_or(total_value);
        }
        total_value
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

    pub fn get_asset_price(env: Env, asset: Address) -> i128 {
        if asset == Self::get_asset(&env) {
            return 1_000_000_000;
        }
        let oracle = Self::get_oracle(&env);
        env.invoke_contract::<i128>(
            &oracle,
            &soroban_sdk::Symbol::new(&env, "price"),
            soroban_sdk::vec![&env, asset.into_val(&env)],
        )
    }

    /// Add an asset to the supported/whitelisted list for deposits.
    pub fn add_supported_asset(env: Env, asset: Address) {
        Self::require_admin(&env);
        let mut supported: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .unwrap_or(Vec::new(&env));
        if !supported.contains(asset.clone()) {
            supported.push_back(asset.clone());
            env.storage()
                .instance()
                .set(&DataKey::SupportedAssets, &supported);
            env.events().publish((symbol_short!("AssetAdd"),), asset);
        }
    }

    pub fn is_supported_asset(env: Env, asset: Address) -> bool {
        let supported: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .unwrap_or(Vec::new(&env));
        supported.contains(asset)
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
            (soroban_sdk::Symbol::new(
                &env,
                "OracleCircuitBreakerActivated",
            ),),
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
            return Self::emit_and_err(env, Error::UserBlocked);
        }

        if allowlist_mode && !allowlist.contains(user.clone()) {
            env.events()
                .publish((soroban_sdk::Symbol::new(env, "UserBlocked"),), user);
            return Self::emit_and_err(env, Error::UserBlocked);
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
            env.storage()
                .instance()
                .set(&DataKey::Blocklist, &blocklist);
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
            env.storage()
                .instance()
                .set(&DataKey::Blocklist, &blocklist);
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
            env.storage()
                .instance()
                .set(&DataKey::Allowlist, &allowlist);
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
            env.storage()
                .instance()
                .set(&DataKey::Allowlist, &allowlist);
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
        Self::read_user_balance(&env, &user)
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

    pub fn set_proposal_ttl_ledgers(env: Env, ledgers: u32) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::ProposalTtlLedgers, &ledgers);
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "ProposalTtlLedgers"),),
            ledgers,
        );
    }

    pub fn get_proposal_ttl_ledgers(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalTtlLedgers)
            .unwrap_or(DEFAULT_PROPOSAL_TTL_LEDGERS)
    }

    pub fn prune_old_proposals(env: Env) -> u32 {
        Self::require_admin(&env);
        Self::prune_old_proposals_internal(&env)
    }

    pub fn list_proposals(env: Env, offset: u32, limit: u32) -> Vec<Proposal> {
        if limit == 0 {
            return Vec::new(&env);
        }

        let proposal_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ProposalIds)
            .unwrap_or(Vec::new(&env));
        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or(Map::new(&env));

        let mut listed = Vec::new(&env);
        let end = offset.saturating_add(limit);
        let mut index = offset;
        while index < proposal_ids.len() && index < end {
            let proposal_id = proposal_ids.get(index).unwrap();
            if let Some(proposal) = proposals.get(proposal_id) {
                listed.push_back(proposal);
            }
            index += 1;
        }
        listed
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Option<Proposal> {
        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or(Map::new(&env));
        proposals.get(proposal_id)
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
        let asset = Self::get_asset(&env);
        env.storage()
            .instance()
            .set(&DataKey::AssetTotalAssets(asset), &amount);
    }

    pub fn set_total_shares(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalShares, &amount);
    }

    pub fn set_balance(env: Env, user: Address, amount: i128) {
        Self::write_user_balance(&env, &user, amount);
    }

    pub fn set_token(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }

    fn require_admin(env: &Env) -> Address {
        let admin = Self::read_admin(env);
        admin.require_auth();
        admin
    }

    fn proposal_ttl_ledgers(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalTtlLedgers)
            .unwrap_or(DEFAULT_PROPOSAL_TTL_LEDGERS)
    }

    fn prune_old_proposals_internal(env: &Env) -> u32 {
        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or(Map::new(env));
        let proposal_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ProposalIds)
            .unwrap_or(Vec::new(env));
        let ttl = Self::proposal_ttl_ledgers(env);
        let current_ledger = env.ledger().sequence();
        let mut retained_ids = Vec::new(env);
        let mut pruned = 0_u32;

        for proposal_id in proposal_ids.iter() {
            if let Some(proposal) = proposals.get(proposal_id) {
                let expired = proposal.executed
                    && proposal.executed_ledger > 0
                    && current_ledger.saturating_sub(proposal.executed_ledger) >= ttl;
                if expired {
                    proposals.remove(proposal_id);
                    pruned = pruned.saturating_add(1);
                } else {
                    retained_ids.push_back(proposal_id);
                }
            }
        }

        env.storage()
            .instance()
            .set(&DataKey::Proposals, &proposals);
        env.storage()
            .instance()
            .set(&DataKey::ProposalIds, &retained_ids);

        if pruned > 0 {
            env.events()
                .publish((soroban_sdk::Symbol::new(env, "ProposalsPruned"),), pruned);
        }

        pruned
    }

    fn record_pause_change(env: &Env, caller: Address, state: bool) {
        env.storage().instance().set(&DataKey::Paused, &state);
        let timestamp = env.ledger().timestamp();
        let mut history: Vec<(u64, Address, bool)> = env
            .storage()
            .instance()
            .get(&DataKey::PauseHistory)
            .unwrap_or(Vec::new(env));
        history.push_back((timestamp, caller.clone(), state));
        env.storage()
            .instance()
            .set(&DataKey::PauseHistory, &history);

        let event_name = if state {
            "VaultPaused"
        } else {
            "VaultUnpaused"
        };
        env.events().publish(
            (soroban_sdk::Symbol::new(env, event_name),),
            (caller, timestamp),
        );
    }

    fn record_share_price_snapshot(env: &Env) {
        let mut history: Vec<(u64, i128)> = env
            .storage()
            .instance()
            .get(&DataKey::SharePriceHistory)
            .unwrap_or(Vec::new(env));
        if history.len() >= SHARE_PRICE_HISTORY_CAP {
            history.remove(0);
        }
        history.push_back((env.ledger().timestamp(), Self::get_share_price(env)));
        env.storage()
            .instance()
            .set(&DataKey::SharePriceHistory, &history);
    }

    // ── Emergency Pause ──────────────────────────
    pub fn set_paused(env: Env, state: bool) {
        let admin = Self::read_admin(&env);
        admin.require_auth();
        Self::record_pause_change(&env, admin, state);
    }

    pub fn emergency_shutdown(env: Env, admin: Address) {
        admin.require_auth();

        if admin != Self::read_admin(&env) {
            panic!("Unauthorized");
        }

        if Self::emergency_shutdown_active(&env) {
            return;
        }

        env.storage()
            .instance()
            .set(&DataKey::EmergencyShutdown, &true);

        Self::record_pause_change(&env, admin, true);
    }

    pub fn emergency_withdraw(env: Env, from: Address) {
        let _guard = Guard::new(&env);
        Self::check_version(&env, 1);

        if !Self::emergency_shutdown_active(&env) {
            panic!("EmergencyShutdownNotActive");
        }

        from.require_auth();

        let current_balance = Self::read_user_balance(&env, &from);

        let mut pending_withdrawals: Vec<QueuedWithdrawal> = env
            .storage()
            .instance()
            .get(&DataKey::PendingWithdrawals)
            .unwrap_or(Vec::new(&env));

        let mut queued_shares = 0_i128;
        let mut queued_index: Option<u32> = None;
        for i in 0..pending_withdrawals.len() {
            let w = pending_withdrawals.get(i).unwrap();
            if w.user == from {
                queued_shares = w.shares;
                queued_index = Some(i);
                break;
            }
        }

        if let Some(index) = queued_index {
            pending_withdrawals.remove(index);
            env.storage()
                .instance()
                .set(&DataKey::PendingWithdrawals, &pending_withdrawals);
        }

        let shares_to_withdraw = current_balance.checked_add(queued_shares).unwrap();
        if shares_to_withdraw <= 0 {
            panic!("insufficient shares for withdrawal");
        }

        let assets_to_withdraw = Self::convert_to_assets(env.clone(), shares_to_withdraw);

        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);

        let new_total_shares = total_shares.checked_sub(shares_to_withdraw).unwrap();
        let new_total_assets = total_assets.checked_sub(assets_to_withdraw).unwrap();

        Self::set_total_shares(env.clone(), new_total_shares);
        Self::set_total_assets(env.clone(), new_total_assets);
        Self::write_user_balance(&env, &from, 0_i128);

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
            (soroban_sdk::Symbol::new(&env, "EmergencyWithdraw"), from),
            (
                shares_to_withdraw,
                assets_to_withdraw,
                env.ledger().timestamp(),
            ),
        );
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

    pub fn is_emergency_shutdown(env: Env) -> bool {
        Self::emergency_shutdown_active(&env)
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

    fn emergency_shutdown_active(env: &Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::EmergencyShutdown)
            .unwrap_or(false)
    }

    fn assert_not_emergency_shutdown(env: &Env) {
        if Self::emergency_shutdown_active(env) {
            panic!("EmergencyShutdownActive");
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
    fn require_admin_or_oracle(_env: &Env, caller: &Address, admin: &Address, oracle: &Address) {
        if *caller == *admin || *caller == *oracle {
            caller.require_auth();
        } else {
            // Neither admin nor oracle is the caller.
            panic!("Unauthorized: expected admin or oracle");
        }
    }

    fn require_owner_or_delegate(env: &Env, owner: &Address, caller: &Address) {
        caller.require_auth();

        if caller == owner {
            return;
        }

        match Self::read_delegate(env, owner) {
            Some(delegate) if delegate == *caller => (),
            _ => panic!("unauthorized: caller is neither owner nor delegate"),
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
        let balance = Self::read_user_balance(&env, &user);

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
        let proposal_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ProposalIds)
            .unwrap_or(Vec::new(&env));
        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or(Map::new(&env));
        let mut active_proposal_count = 0_u32;
        for proposal_id in proposal_ids.iter() {
            if let Some(proposal) = proposals.get(proposal_id) {
                if !proposal.executed {
                    active_proposal_count = active_proposal_count.saturating_add(1);
                }
            }
        }
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
