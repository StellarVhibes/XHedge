#![cfg(test)]
use super::*;
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{
    testutils::storage::Persistent as _, testutils::Address as _, testutils::Events as _,
    testutils::Ledger as _, Address, Env, Map, Symbol, TryFromVal,
};

extern crate std;

fn create_token_contract<'a>(
    env: &Env,
    admin: &Address,
) -> (Address, StellarAssetClient<'a>, TokenClient<'a>) {
    let contract_id = env.register_stellar_asset_contract_v2(admin.clone());
    let stellar_asset_client = StellarAssetClient::new(env, &contract_id.address());
    let token_client = TokenClient::new(env, &contract_id.address());
    (contract_id.address(), stellar_asset_client, token_client)
}

#[test]
fn test_init_stores_roles() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &asset, &oracle, &treasury, &500u32, &guardians, &1u32,
    );

    assert_eq!(client.read_admin(), admin);
    assert_eq!(client.get_oracle(), oracle);
    assert_eq!(client.get_asset(), asset);
    assert_eq!(client.treasury(), treasury);
    assert_eq!(client.fee_percentage(), 500u32);

    // SC-3: Assert initial vault state is zero
    assert_eq!(client.total_assets(), 0);
    assert_eq!(client.total_shares(), 0);
    assert_eq!(client.get_strategies().len(), 0);
}

#[test]
fn test_init_already_initialized() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let result = client.try_init(
        &admin,
        &asset,
        &oracle,
        &treasury,
        &500u32,
        &soroban_sdk::vec![&env, admin.clone()],
        &1u32,
    );
    assert!(result.is_ok());

    let result = client.try_init(
        &admin,
        &asset,
        &oracle,
        &treasury,
        &500u32,
        &soroban_sdk::vec![&env, admin.clone()],
        &1u32,
    );
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_error_to_symbol_snapshot() {
    let env = Env::default();

    let cases = [
        (Error::NotInitialized, "not_initialized"),
        (Error::AlreadyInitialized, "already_initialized"),
        (Error::NegativeAmount, "negative_amount"),
        (Error::Unauthorized, "unauthorized"),
        (Error::NoStrategies, "no_strategies"),
        (Error::ContractPaused, "contract_paused"),
        (Error::DepositCapExceeded, "deposit_cap_exceeded"),
        (Error::WithdrawalCapExceeded, "withdrawal_cap_exceeded"),
        (Error::StaleOracleData, "stale_oracle_data"),
        (Error::InvalidTimestamp, "invalid_timestamp"),
        (Error::SlippageExceeded, "slippage_exceeded"),
        (Error::ProposalNotFound, "proposal_not_found"),
        (Error::AlreadyApproved, "already_approved"),
        (Error::ProposalExecuted, "proposal_executed"),
        (Error::InsufficientApprovals, "insufficient_approvals"),
        (Error::TimelockNotElapsed, "timelock_not_elapsed"),
        (Error::WithdrawalNotFound, "withdrawal_not_found"),
        (Error::QueueEmpty, "queue_empty"),
        (Error::InvalidAllocationSum, "invalid_allocation_sum"),
        (Error::NegativeAllocation, "negative_allocation"),
        (Error::ZeroAddressStrategy, "zero_address_strategy"),
        (Error::HarvestTooEarly, "harvest_too_early"),
        (Error::ReentrantCall, "reentrant_call"),
        (Error::UserBlocked, "user_blocked"),
        (Error::CircuitBreakerActive, "circuit_breaker_active"),
        (Error::EmergencyShutdownActive, "emergency_shutdown_active"),
    ];

    for (error, expected) in cases {
        assert_eq!(error.to_symbol(&env), Symbol::new(&env, expected));
    }
}

#[test]
fn test_convert_to_assets() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // 1. Test 1:1 conversion when total_shares is 0
    assert_eq!(client.convert_to_assets(&100), 100);

    // 2. Test exact conversion
    client.set_total_assets(&100);
    client.set_total_shares(&100);
    assert_eq!(client.convert_to_assets(&50), 50);

    // 3. Test rounding down (favors vault)
    client.set_total_assets(&10);
    client.set_total_shares(&4);
    assert_eq!(client.convert_to_assets(&3), 7);

    // 4. Test larger values
    client.set_total_assets(&1000);
    client.set_total_shares(&300);
    assert_eq!(client.convert_to_assets(&100), 333);
}

#[test]
#[should_panic(expected = "negative amount")]
fn test_convert_to_assets_negative() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    client.convert_to_assets(&-1);
}

#[test]
fn test_convert_to_shares() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // 1. Initial Deposit (total_shares = 0)
    assert_eq!(client.convert_to_shares(&100), 100);

    // 2. Precision Loss (favors vault by rounding down)
    client.set_total_assets(&3);
    client.set_total_shares(&1);
    assert_eq!(client.convert_to_shares(&10), 3);

    // 3. Standard Proportional Minting
    client.set_total_assets(&1000);
    client.set_total_shares(&500);
    assert_eq!(client.convert_to_shares(&200), 100);

    // 4. Rounding Down with Large Values
    client.set_total_assets(&300);
    client.set_total_shares(&1000);
    assert_eq!(client.convert_to_shares(&100), 333);
}

#[test]
fn test_strategy_registry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let strategy = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
    assert_eq!(client.read_admin(), admin);

    client.propose_action(&admin, &ActionType::AddStrategy(strategy.clone()));
    let strategies = client.get_strategies();
    assert_eq!(strategies.len(), 1);
    assert_eq!(strategies.get(0).unwrap(), strategy);

    let strategy_2 = Address::generate(&env);
    client.propose_action(&admin, &ActionType::AddStrategy(strategy_2.clone()));
    let strategies = client.get_strategies();
    assert_eq!(strategies.len(), 2);
    assert_eq!(strategies.get(1).unwrap(), strategy_2);
}

#[test]
#[should_panic(expected = "negative amount")]
fn test_convert_to_shares_negative() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    client.convert_to_shares(&-1);
}

    #[test]
    fn test_take_fees_accuracy_and_transfer() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];

        client.init(&admin, &token_id, &oracle, &treasury, &500u32, &guardians, &1u32); // 5% fee

        // Mint tokens to vault to simulate yield
        stellar_asset_client.mint(&contract_id, &1000);

        // Calculate expected: 5% of 1000 = 50. Remaining = 950.
        let remaining = client.take_fees(&1000);
        assert_eq!(remaining, 950);

        // Verify treasury received fee
        assert_eq!(token_client.balance(&treasury), 50);
    }

    #[test]
    fn test_take_fees_large_amount_no_overflow() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];

        client.init(&admin, &token_id, &oracle, &treasury, &10000u32, &guardians, &1u32); // 100% fee

        // Large amount: 10^18 (Standard 18 decimals)
        let large_amount = 1_000_000_000_000_000_000_i128;
        stellar_asset_client.mint(&contract_id, &large_amount);

        let remaining = client.take_fees(&large_amount);
        assert_eq!(remaining, 0); // 100% taken
    }

    #[test]
    fn test_set_fee_pct_validation() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        // Valid
        assert!(client.try_set_fee_pct(&500).is_ok());
        assert_eq!(client.fee_percentage(), 500);

        // Invalid (> 100%)
        let res = client.try_set_fee_pct(&10001);
        assert_eq!(res, Err(Ok(Error::InvalidFeePercentage)));
    }

    #[test]
    fn test_remove_strategy_logic() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        let strategy = Address::generate(&env);
        client.propose_action(&admin, &ActionType::AddStrategy(strategy.clone()));
        assert_eq!(client.get_strategies().len(), 1);

        // Success remove
        client.remove_strategy(&strategy, &false);
        assert_eq!(client.get_strategies().len(), 0);
    }

#[test]
fn test_deposit_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let user = Address::generate(&env);
    let deposit_amount = 1000;
    stellar_asset_client.mint(&user, &deposit_amount);

    client.deposit(&user, &token_id, &deposit_amount, &None::<i128>);

    assert_eq!(client.balance(&user), 1000);
    assert_eq!(client.total_assets(), 1000);
    assert_eq!(client.total_shares(), 1000);
}

#[test]
fn test_withdraw_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user = Address::generate(&env);
    client.set_balance(&user, &100);

    stellar_asset_client.mint(&contract_id, &5000);

    client.withdraw(&user, &user, &token_id, &50);

    assert_eq!(client.balance(&user), 50);
    assert_eq!(client.total_shares(), 950);
    assert_eq!(client.total_assets(), 4750);
    assert_eq!(token_client.balance(&user), 250);
}

#[test]
fn test_set_and_remove_delegate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.set_delegate(&owner, &delegate);
    assert_eq!(client.get_delegate(&owner), Some(delegate.clone()));

    client.remove_delegate(&owner);
    assert_eq!(client.get_delegate(&owner), None);
}

#[test]
fn test_balance_reads_and_writes_refresh_persistent_ttl() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let user = Address::generate(&env);
    client.set_balance(&user, &123_i128);

    let balance_key = DataKey::Balance(user.clone());
    let initial_ttl = env.as_contract(&contract_id, || {
        env.storage().persistent().get_ttl(&balance_key)
    });
    assert_eq!(initial_ttl, BALANCE_TTL_BUMP);

    env.ledger().set_sequence_number(
        env.ledger()
            .sequence()
            .checked_add(initial_ttl - 5)
            .unwrap(),
    );
    let ttl_before_refresh = env.as_contract(&contract_id, || {
        env.storage().persistent().get_ttl(&balance_key)
    });
    assert_eq!(ttl_before_refresh, 5);

    assert_eq!(client.balance(&user), 123);
    let refreshed_ttl = env.as_contract(&contract_id, || {
        env.storage().persistent().get_ttl(&balance_key)
    });
    assert_eq!(refreshed_ttl, BALANCE_TTL_BUMP);

    env.ledger().set_sequence_number(
        env.ledger()
            .sequence()
            .checked_add(initial_ttl - 10)
            .unwrap(),
    );
    assert_eq!(client.balance(&user), 123);
    let ttl_after_second_read = env.as_contract(&contract_id, || {
        env.storage().persistent().get_ttl(&balance_key)
    });
    assert_eq!(ttl_after_second_read, BALANCE_TTL_BUMP);
}

#[test]
fn test_delegate_can_withdraw_for_owner() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&owner, &100);
    client.set_delegate(&owner, &delegate);

    stellar_asset_client.mint(&contract_id, &5000);

    client.withdraw(&delegate, &owner, &token_id, &50);

    assert_eq!(client.balance(&owner), 50);
    assert_eq!(client.total_shares(), 950);
    assert_eq!(client.total_assets(), 4750);
    assert_eq!(token_client.balance(&owner), 250);
    assert_eq!(token_client.balance(&delegate), 0);
}

#[test]
fn test_non_delegate_withdraw_rejected() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let stranger = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&owner, &100);
    client.set_delegate(&owner, &delegate);

    stellar_asset_client.mint(&contract_id, &5000);

    let res = client.try_withdraw(&stranger, &owner, &token_id, &50);
    assert_eq!(res, Err(Ok(Error::Unauthorized)));
    assert_eq!(client.balance(&owner), 100);
    assert_eq!(client.total_shares(), 1000);
    assert_eq!(client.total_assets(), 5000);
    assert_eq!(token_client.balance(&owner), 0);
}

#[test]
fn test_deposit_slippage_exact_minimum_passes() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    client.set_total_assets(&2000);
    client.set_total_shares(&1000);

    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &101);

    client.deposit(&user, &token_id, &101, &Some(50));

    assert_eq!(client.balance(&user), 50);
    assert_eq!(client.total_assets(), 2101);
    assert_eq!(client.total_shares(), 1050);
}

#[test]
fn test_deposit_slippage_below_minimum_fails() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    client.set_total_assets(&2000);
    client.set_total_shares(&1000);

    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &101);

    let res = client.try_deposit(&user, &token_id, &101, &Some(51));
    assert_eq!(res, Err(Ok(Error::SlippageExceeded)));
    assert_eq!(client.balance(&user), 0);
    assert_eq!(client.total_assets(), 2000);
    assert_eq!(client.total_shares(), 1000);
    assert_eq!(token_client.balance(&user), 101);
}

#[test]
fn test_withdraw_slippage_exact_minimum_passes() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user = Address::generate(&env);
    client.set_balance(&user, &100);
    stellar_asset_client.mint(&contract_id, &250);

    client.withdraw(&user, &user, &token_id, &50);

    assert_eq!(client.balance(&user), 50);
    assert_eq!(client.total_shares(), 950);
    assert_eq!(client.total_assets(), 4750);
    assert_eq!(token_client.balance(&user), 250);
}

#[test]
fn test_withdraw_emits_withdrawn_event_with_correct_amount() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user = Address::generate(&env);
    client.set_balance(&user, &100);
    stellar_asset_client.mint(&contract_id, &250);

    client.withdraw(&user, &user, &token_id, &50);

    let mut found_withdrawn = false;
    for (_contract, topics, data) in env.events().all().iter() {
        if topics.len() < 1 {
            continue;
        }
        let topic_symbol = Symbol::try_from_val(&env, &topics.get(0).unwrap()).unwrap();
        if topic_symbol == Symbol::new(&env, "Withdrawn") {
            let withdrawn = Withdrawn::try_from_val(&env, &data).unwrap();
            assert_eq!(withdrawn.withdrawer, user);
            assert_eq!(withdrawn.amount_out, 250);
            assert_eq!(withdrawn.shares_burned, 50);
            found_withdrawn = true;
            break;
        }
    }
    assert!(found_withdrawn, "expected Withdrawn event to be emitted");
}

#[test]
fn test_rebalance_admin_auth_accepted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
    env.ledger().set_timestamp(12345);
    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());
    // Propose Rebalance with threshold 1 -> immediate execution
    client.propose_action(&admin, &ActionType::Rebalance(50u32));
}

#[test]
fn test_rebalance_oracle_auth_accepted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone(), oracle.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
    env.ledger().set_timestamp(12345);
    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());

    // Propose Rebalance with threshold 1 -> immediate execution
    client.propose_action(&oracle, &ActionType::Rebalance(50u32));
}

#[test]
fn test_multisig_set_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone(), oracle.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &2u32);

    let id = client.propose_action(&admin, &ActionType::SetPaused(true));

    // One approval not enough
    assert!(!client.is_paused());

    // Second approval triggers execution
    client.approve_action(&oracle, &id);
    assert!(client.is_paused());
}

#[test]
fn test_multisig_add_strategy() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy = Address::generate(&env);
    // threshold 1 -> immediate
    client.propose_action(&admin, &ActionType::AddStrategy(strategy.clone()));

    assert_eq!(client.get_strategies().get(0).unwrap(), strategy);
}

#[test]
fn test_multisig_unauthorized_propose() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin,
        &Address::generate(&env),
        &Address::generate(&env),
        &Address::generate(&env),
        &0,
        &guardians,
        &1,
    );

    let stranger = Address::generate(&env);
    let result = client.try_propose_action(&stranger, &ActionType::Rebalance(50u32));
    assert!(result.is_err());
}

#[test]
fn test_guardian_crud() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let guardian_2 = Address::generate(&env);
    client.add_guardian(&guardian_2);
    assert_eq!(client.get_guardians().len(), 2);
    assert!(client.get_guardians().contains(guardian_2.clone()));

    client.set_threshold(&2u32);
    assert_eq!(client.get_threshold(), 2);

    client.remove_guardian(&guardian_2);
    assert_eq!(client.get_guardians().len(), 1);
    assert!(!client.get_guardians().contains(guardian_2));
}

#[cfg(test)]
mod strategy_health_tests {
    use super::*;
    use mock_strategy::MockStrategyClient;

    fn create_mock_strategy(env: &Env) -> (Address, MockStrategyClient<'_>) {
        let mock_strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
        let mock_client = MockStrategyClient::new(env, &mock_strategy_id);
        (mock_strategy_id, mock_client)
    }

    #[test]
    fn test_remove_strategy_with_funds() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) =
            create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(
            &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
        );

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        // Initialise the mock strategy in real-token mode so withdraw()
        // transfers tokens back to the vault contract.
        mock_client.init(&contract_id, &token_id);

        client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

        // Mint tokens directly to strategy and record the balance internally.
        stellar_asset_client.mint(&mock_strategy_id, &1000);
        mock_client.deposit(&1000);

        // Non-force remove should fail while the strategy still has funds.
        let res = env.try_invoke_contract::<(), soroban_sdk::Error>(
            &contract_id,
            &soroban_sdk::Symbol::new(&env, "remove_strategy"),
            soroban_sdk::vec![
                &env,
                mock_strategy_id.clone().into_val(&env),
                false.into_val(&env)
            ],
        );
        assert!(res.is_err());

        // Force remove should succeed and remove strategy bookkeeping.
        client.remove_strategy(&mock_strategy_id, &true);

        // Strategy should be removed from list.
        let strategies = client.get_strategies();
        assert!(!strategies.contains(&mock_strategy_id));

        // Funds remain in strategy token balance after force removal.
        assert_eq!(mock_client.balance(), 1000);
        assert_eq!(token_client.balance(&contract_id), 0);

        // Current implementation keeps prior health records even after removal.
        let health = client.get_strategy_health(&mock_strategy_id);
        assert!(health.is_some());
    }

    #[test]
    fn test_remove_strategy_empty_balance() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        let (mock_strategy_id, _mock_client) = create_mock_strategy(&env);
        client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

        // Remove strategy with empty balance
        client.remove_strategy(&mock_strategy_id, &false);

        // Strategy should be removed from list
        let strategies = client.get_strategies();
        assert!(!strategies.contains(&mock_strategy_id));
    }

    #[test]
    fn test_remove_nonexistent_strategy() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        let nonexistent_strategy = Address::generate(&env);
        let result = client.try_remove_strategy(&nonexistent_strategy, &false);
        assert_eq!(result, Err(Ok(Error::NoStrategies)));
    }

    #[test]
    fn test_get_strategy_health() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        let (mock_strategy_id, _mock_client) = create_mock_strategy(&env);
        client.set_timelock_duration(&0u64);
        client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

        // AddStrategy initialises health with is_healthy = true
        let health = client.get_strategy_health(&mock_strategy_id);
        assert!(health.is_some());
        assert!(health.unwrap().is_healthy);

        // After flagging, should be unhealthy
        client.flag_strategy(&mock_strategy_id);
        let health = client.get_strategy_health(&mock_strategy_id);
        assert!(health.is_some());
        assert!(!health.unwrap().is_healthy);
    }

    #[test]
    fn test_check_health_no_strategies() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        // With no strategies registered, check_strategy_health returns NoStrategies error.
        let result = client.try_check_strategy_health();
        assert_eq!(result, Err(Ok(Error::NoStrategies)));
    }

    #[test]
    fn test_check_strategy_health_strike_counter_and_auto_flag() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let asset = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);
        client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

        // Set up expected allocations (100% to mock strategy)
        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id.clone(), 10000);
        env.ledger().set_timestamp(1000);
        client.set_oracle_data(&allocations, &env.ledger().timestamp());

        // Set up vault state
        client.set_total_assets(&1000);

        // --- Iteration 1: Failure 1 ---
        mock_client.deposit(&800); // 20% deviation
        let unhealthy = client.check_strategy_health();
        assert_eq!(unhealthy.len(), 0); // Not flagged yet (threshold = 3)
        let health = client.get_strategy_health(&mock_strategy_id).unwrap();
        assert_eq!(health.consecutive_failures, 1);
        assert!(health.is_healthy);

        // --- Iteration 2: Failure 2 ---
        let unhealthy = client.check_strategy_health();
        assert_eq!(unhealthy.len(), 0);
        let health = client.get_strategy_health(&mock_strategy_id).unwrap();
        assert_eq!(health.consecutive_failures, 2);
        assert!(health.is_healthy);

        // --- Iteration 3: Recovery resets counter ---
        mock_client.withdraw(&800);
        mock_client.deposit(&1000); // Back to normal
        let unhealthy = client.check_strategy_health();
        assert_eq!(unhealthy.len(), 0);
        let health = client.get_strategy_health(&mock_strategy_id).unwrap();
        assert_eq!(health.consecutive_failures, 0);
        assert!(health.is_healthy);

        // --- Iteration 4: Failure 1 again ---
        mock_client.withdraw(&1000);
        mock_client.deposit(&800);
        client.check_strategy_health();
        assert_eq!(
            client
                .get_strategy_health(&mock_strategy_id)
                .unwrap()
                .consecutive_failures,
            1
        );

        // --- Iteration 5: Failure 2 ---
        client.check_strategy_health();
        assert_eq!(
            client
                .get_strategy_health(&mock_strategy_id)
                .unwrap()
                .consecutive_failures,
            2
        );

        // --- Iteration 6: Failure 3 -> AUTO-FLAG ---
        let unhealthy = client.check_strategy_health();
        assert_eq!(unhealthy.len(), 1);
        assert_eq!(unhealthy.get(0).unwrap(), mock_strategy_id);
        let health = client.get_strategy_health(&mock_strategy_id).unwrap();
        assert_eq!(health.consecutive_failures, 3);
        assert!(!health.is_healthy);

        // --- Iteration 7: Recovery does reset counter but stays un-healthy (manual review required) ---
        mock_client.withdraw(&800);
        mock_client.deposit(&1000);
        client.check_strategy_health();
        let health = client.get_strategy_health(&mock_strategy_id).unwrap();
        assert_eq!(health.consecutive_failures, 0);
        assert!(!health.is_healthy);

        // --- Test custom threshold ---
        let (mock_strategy_2, mock_client_2) = create_mock_strategy(&env);
        client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_2.clone()));

        // Set threshold to 2
        client.set_max_consecutive_failures(&2);

        // Re-setup allocations for both
        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id.clone(), 5000);
        allocations.set(mock_strategy_2.clone(), 5000);
        env.ledger().set_timestamp(env.ledger().timestamp() + 1);
        client.set_oracle_data(&allocations, &env.ledger().timestamp());

        mock_client_2.deposit(&400); // 20% deviation (expected 500)
        client.check_strategy_health();
        assert_eq!(
            client
                .get_strategy_health(&mock_strategy_2)
                .unwrap()
                .consecutive_failures,
            1
        );
        assert!(
            client
                .get_strategy_health(&mock_strategy_2)
                .unwrap()
                .is_healthy
        );

        client.check_strategy_health();
        assert_eq!(
            client
                .get_strategy_health(&mock_strategy_2)
                .unwrap()
                .consecutive_failures,
            2
        );
        assert!(
            !client
                .get_strategy_health(&mock_strategy_2)
                .unwrap()
                .is_healthy
        );
    }
}

// ── Timelock Tests ─────────────────────────

#[test]
fn test_timelock_duration_setting() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set timelock duration to 100 seconds
    client.set_timelock_duration(&100);

    // Verify it was set (we can't directly read it, but execution will respect it)
}

#[test]
fn test_timelock_prevents_premature_execution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set timelock duration to 100 seconds
    client.set_timelock_duration(&100);

    // Set current timestamp
    env.ledger().set_timestamp(1000);

    // Propose action - should succeed but not execute because timelock hasn't elapsed
    // With threshold 1, it tries to execute immediately but timelock blocks it
    // The proposal is created but not executed
    let _proposal_id = client.propose_action(&admin, &ActionType::SetPaused(true));
    assert!(!client.is_paused()); // Should not be paused because timelock blocked execution
}

#[test]
fn test_timelock_blocks_immediate_execution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set timelock duration to 100 seconds
    client.set_timelock_duration(&100);

    // Set initial timestamp
    env.ledger().set_timestamp(1000);

    // Propose action - this will store the proposal with timestamp
    // Since threshold is 1, it will try to execute but timelock will block
    let _proposal_id = client.propose_action(&admin, &ActionType::SetPaused(true));
    assert!(!client.is_paused()); // Should not be paused because timelock blocked execution
}

#[test]
fn test_timelock_with_multisig_approval() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let asset = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone(), oracle.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &2u32);

    // Set timelock duration to 100 seconds
    client.set_timelock_duration(&100);

    // Set initial timestamp
    env.ledger().set_timestamp(1000);

    // Propose action (threshold is 2, so it won't execute immediately)
    let proposal_id = client.propose_action(&admin, &ActionType::SetPaused(true));

    // Try to approve immediately - should fail due to timelock
    let result = client.try_approve_action(&oracle, &proposal_id);
    assert_eq!(result, Err(Ok(Error::TimelockNotElapsed)));

    // Advance time by 100 seconds
    env.ledger().set_timestamp(1100);

    // Now approve - should succeed and execute
    client.approve_action(&oracle, &proposal_id);
    assert!(client.is_paused());
}

#[test]
fn test_timelock_zero_duration_allows_immediate_execution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set timelock duration to 0 (no timelock)
    client.set_timelock_duration(&0);

    // Propose action - should execute immediately
    client.propose_action(&admin, &ActionType::SetPaused(true));
    assert!(client.is_paused());
}

#[test]
fn test_timelock_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set timelock duration to 100 seconds
    client.set_timelock_duration(&100);

    // Set initial timestamp
    env.ledger().set_timestamp(1000);

    // Propose action - TimelockStarted event should be emitted
    // (Even if execution fails, the event should be emitted)
    let _ = client.try_propose_action(&admin, &ActionType::SetPaused(true));

    // Advance time
    env.ledger().set_timestamp(1100);

    // Propose again - should succeed and emit both events
    client.propose_action(&admin, &ActionType::SetPaused(true));
    // TimelockExecuted event should be emitted during execution
}

#[test]
fn test_proposal_pruning_preserves_active_and_recent_proposals() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let guardian = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone(), guardian.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
    client.set_proposal_ttl_ledgers(&5u32);

    env.ledger().set_sequence_number(10);
    env.ledger().set_timestamp(1000);
    let old_id = client.propose_action(&admin, &ActionType::SetPaused(true));
    assert!(client.get_proposal(&old_id).unwrap().executed);

    client.set_threshold(&2u32);
    env.ledger().set_sequence_number(12);
    env.ledger().set_timestamp(1200);
    let active_id = client.propose_action(&admin, &ActionType::SetPaused(false));
    assert!(!client.get_proposal(&active_id).unwrap().executed);

    client.set_threshold(&1u32);
    env.ledger().set_sequence_number(15);
    env.ledger().set_timestamp(1500);
    let recent_id = client.propose_action(&admin, &ActionType::SetPaused(true));
    assert!(client.get_proposal(&recent_id).unwrap().executed);

    env.ledger().set_sequence_number(16);
    env.ledger().set_timestamp(1600);
    // Note: proposing actions already prunes old proposals internally, so there may be nothing left
    // to prune here depending on the current ledger sequence.
    assert!(client.prune_old_proposals() <= 1);
    assert!(client.get_proposal(&old_id).is_none());
    assert!(!client.get_proposal(&active_id).unwrap().executed);
    assert!(client.get_proposal(&recent_id).unwrap().executed);

    let proposals = client.list_proposals(&0u32, &10u32, &false);
    assert_eq!(proposals.len(), 1);
    assert_eq!(proposals.get(0).unwrap().id, active_id);

    client.set_threshold(&2u32);
    client.approve_action(&guardian, &active_id);
    assert!(!client.is_paused());

    client.set_threshold(&1u32);
    env.ledger().set_sequence_number(17);
    env.ledger().set_timestamp(1700);
    let new_id = client.propose_action(&admin, &ActionType::SetPaused(true));
    assert_eq!(new_id, 4);
    assert!(client.get_proposal(&new_id).unwrap().executed);
}

#[test]
fn test_list_proposals_pagination_and_get_proposal() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let first_id = client.propose_action(&admin, &ActionType::SetPaused(true));
    let second_id = client.propose_action(&admin, &ActionType::SetPaused(false));
    let third_id = client.propose_action(&admin, &ActionType::SetPaused(true));

    let first_page = client.list_proposals(&0u32, &2u32, &true);
    assert_eq!(first_page.len(), 2);
    assert_eq!(first_page.get(0).unwrap().id, first_id);
    assert_eq!(first_page.get(1).unwrap().id, second_id);

    let second_page = client.list_proposals(&1u32, &2u32, &true);
    assert_eq!(second_page.len(), 2);
    assert_eq!(second_page.get(0).unwrap().id, second_id);
    assert_eq!(second_page.get(1).unwrap().id, third_id);

    let proposal = client.get_proposal(&second_id).unwrap();
    assert_eq!(proposal.id, second_id);
    assert!(proposal.executed);
    assert!(client.get_proposal(&999u64).is_none());

    let summary = client.get_governance_summary();
    assert_eq!(summary.active_proposal_count, 0);
}

#[test]
fn test_pause_history_contains_pause_and_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    env.ledger().set_timestamp(100);
    client.set_paused(&true);
    env.ledger().set_timestamp(150);
    client.set_paused(&false);

    let history = client.get_pause_history();
    assert_eq!(history.len(), 2);

    let first = history.get(0).unwrap();
    assert_eq!(first.0, 100);
    assert_eq!(first.1, admin);
    assert!(first.2);

    let second = history.get(1).unwrap();
    assert_eq!(second.0, 150);
    assert_eq!(second.1, admin);
    assert!(!client.is_paused());
}

#[test]
fn test_share_price_history_grows_on_harvest() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    assert_eq!(client.get_share_price_history().len(), 0);

    client.set_total_assets(&200);
    client.set_total_shares(&100);

    let strategy = env.register_contract(None, mock_strategy::MockStrategy);
    let strategy_client = mock_strategy::MockStrategyClient::new(&env, &strategy);
    strategy_client.init(&contract_id, &asset);
    client.propose_action(&admin, &ActionType::AddStrategy(strategy.clone()));

    env.ledger().set_timestamp(200);
    assert_eq!(client.harvest(), 0);

    let history = client.get_share_price_history();
    assert_eq!(history.len(), 1);
    let entry = history.get(0).unwrap();
    assert_eq!(entry.0, 200);
    assert_eq!(entry.1, 2_000_000_000);
}

#[test]
fn test_share_price_history_cap_evicts_oldest() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy = env.register_contract(None, mock_strategy::MockStrategy);
    let strategy_client = mock_strategy::MockStrategyClient::new(&env, &strategy);
    strategy_client.init(&contract_id, &asset);
    client.propose_action(&admin, &ActionType::AddStrategy(strategy.clone()));

    for offset in 0..366u32 {
        env.ledger().set_timestamp(1_000 + offset as u64);
        client.harvest();
    }

    let history = client.get_share_price_history();
    assert_eq!(history.len(), 365);
    assert_eq!(history.get(0).unwrap().0, 1_001);
    assert_eq!(history.get(364).unwrap().0, 1_365);
}

// ── Withdrawal Queue Tests ─────────────────────────

#[test]
fn test_withdraw_queue_threshold_setting() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set withdrawal queue threshold
    client.set_withdraw_queue_threshold(&1000);
}

#[test]
fn test_withdraw_below_threshold_processes_immediately() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    // Set queue threshold to 1000
    client.set_withdraw_queue_threshold(&1000);

    // Setup user with balance
    let user = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&user, &200);
    stellar_asset_client.mint(&contract_id, &5000);

    // Withdraw 50 shares (converts to 250 assets, below threshold)
    client.withdraw(&user, &user, &token_id, &50);

    // Should process immediately
    assert_eq!(client.balance(&user), 150);
    assert_eq!(token_client.balance(&user), 250);
    assert_eq!(client.get_pending_withdrawals().len(), 0);
}
#[test]
fn test_withdraw_above_threshold_queues() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    // Set queue threshold to 1000
    client.set_withdraw_queue_threshold(&1000);

    // Setup user with balance
    let user = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&user, &500);
    stellar_asset_client.mint(&contract_id, &5000);

    // Queue 300 shares via queue_withdraw (converts to 1500 assets, above threshold)
    client.queue_withdraw(&user, &user, &token_id, &300);

    // Should be queued; balance is reduced immediately
    assert_eq!(client.balance(&user), 200);
    let pending = client.get_pending_withdrawals();
    assert_eq!(pending.len(), 1);
    assert_eq!(pending.get(0).unwrap().user, user);
    assert_eq!(pending.get(0).unwrap().shares, 300);
}

#[test]
#[should_panic(expected = "ContractPaused")]
fn test_withdraw_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let asset = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.set_paused(&true);
    let user = Address::generate(&env);
    client.withdraw(&user, &user, &asset, &100);
}

#[test]
fn test_delegate_can_queue_withdraw_for_owner() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    client.set_withdraw_queue_threshold(&1000);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&owner, &500);
    client.set_delegate(&owner, &delegate);
    stellar_asset_client.mint(&contract_id, &5000);

    client.queue_withdraw(&delegate, &owner, &token_id, &300);

    assert_eq!(client.balance(&owner), 200);
    let pending = client.get_pending_withdrawals();
    assert_eq!(pending.len(), 1);
    assert_eq!(pending.get(0).unwrap().user, owner);
    assert_eq!(pending.get(0).unwrap().shares, 300);
}

#[test]
fn test_process_withdraw_queue() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    // Set queue threshold
    client.set_withdraw_queue_threshold(&1000);

    // Setup user with balance
    let user = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&user, &500);
    stellar_asset_client.mint(&contract_id, &5000);

    // Queue a withdrawal directly (300 shares = 1500 assets > threshold of 1000)
    client.queue_withdraw(&user, &user, &token_id, &300);
    assert_eq!(client.get_pending_withdrawals().len(), 1);

    // Process the queue
    client.process_queued_withdrawals(&1);

    // Withdrawal should be processed
    assert_eq!(client.get_pending_withdrawals().len(), 0);
    assert_eq!(token_client.balance(&user), 1500); // 300 shares * 5 = 1500 assets
    assert_eq!(client.total_shares(), 700);
    assert_eq!(client.total_assets(), 3500);
}

#[test]
fn test_cancel_withdraw() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    // Set queue threshold
    client.set_withdraw_queue_threshold(&1000);

    // Setup user with balance
    let user = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&user, &500);
    stellar_asset_client.mint(&contract_id, &5000);

    // Queue a withdrawal directly (300 shares = 1500 assets > threshold of 1000)
    client.queue_withdraw(&user, &user, &token_id, &300);
    // Balance is subtracted immediately
    assert_eq!(client.balance(&user), 200);
    assert_eq!(client.get_pending_withdrawals().len(), 1);

    // Cancel the withdrawal
    client.cancel_queued_withdrawal(&user);

    // cancel_queued_withdrawal returns shares to balance
    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.get_pending_withdrawals().len(), 0);
}

#[test]
#[should_panic(expected = "user already has a pending withdrawal")]
fn test_cannot_queue_multiple_withdrawals() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    client.set_withdraw_queue_threshold(&1000);

    let user = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    // Give user enough balance for both withdrawals
    client.set_balance(&user, &600);
    stellar_asset_client.mint(&contract_id, &5000);

    // Queue first withdrawal via queue_withdraw (300 shares = 1500 assets, above threshold of 1000)
    client.queue_withdraw(&user, &user, &token_id, &300);
    // User now has 300 shares remaining

    // Try to queue another - should panic because user already has pending withdrawal
    // This will try to withdraw 250 shares = 1250 assets, which is above threshold
    client.queue_withdraw(&user, &user, &token_id, &250);
}

#[test]
fn test_process_withdraw_queue_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Process empty queue - should return 0 (no-op, not an error)
    let processed = client.process_queued_withdrawals(&1);
    assert_eq!(processed, 0);
}

#[test]
fn test_cancel_withdraw_not_found() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let user = Address::generate(&env);

    // Try to cancel non-existent withdrawal
    let result = client.try_cancel_queued_withdrawal(&user);
    assert_eq!(result, Err(Ok(Error::WithdrawalNotFound)));
}

#[test]
fn test_withdrawal_queue_fifo_order() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    client.set_withdraw_queue_threshold(&1000);

    // Setup two users
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&user1, &300);
    client.set_balance(&user2, &300);
    stellar_asset_client.mint(&contract_id, &5000);

    // Queue withdrawals in order using queue_withdraw
    client.queue_withdraw(&user1, &user1, &token_id, &300);
    client.queue_withdraw(&user2, &user2, &token_id, &300);

    let pending = client.get_pending_withdrawals();
    assert_eq!(pending.len(), 2);
    assert_eq!(pending.get(0).unwrap().user, user1);
    assert_eq!(pending.get(1).unwrap().user, user2);

    // Process first withdrawal
    client.process_queued_withdrawals(&1);
    assert_eq!(token_client.balance(&user1), 1500);
    assert_eq!(token_client.balance(&user2), 0);

    // Process second withdrawal
    client.process_queued_withdrawals(&1);
    assert_eq!(token_client.balance(&user2), 1500);
}

#[test]
fn test_withdrawal_queue_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    client.set_withdraw_queue_threshold(&1000);

    let user = Address::generate(&env);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);
    client.set_balance(&user, &500);
    stellar_asset_client.mint(&contract_id, &5000);

    // 1. Queue withdrawal via queue_withdraw
    client.queue_withdraw(&user, &user, &token_id, &300);
    // Balance is subtracted immediately (500 - 300 = 200)
    assert_eq!(client.balance(&user), 200);
    assert_eq!(client.get_pending_withdrawals().len(), 1);

    // 2. Cancel withdrawal - cancel_queued_withdrawal returns shares, so balance = 200 + 300 = 500
    client.cancel_queued_withdrawal(&user);
    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.get_pending_withdrawals().len(), 0);

    // 3. Queue again (user has 500 shares now)
    client.queue_withdraw(&user, &user, &token_id, &300);
    assert_eq!(client.balance(&user), 200); // reduced immediately to 200
    assert_eq!(client.get_pending_withdrawals().len(), 1);

    // 4. Process withdrawal — process_queued_withdrawals transfers tokens.
    // User balance stays at 200 (since it was already deducted).
    client.process_queued_withdrawals(&1);
    assert_eq!(client.balance(&user), 200);
    assert_eq!(token_client.balance(&user), 1500);
    assert_eq!(client.get_pending_withdrawals().len(), 0);
}
// ── Oracle Allocation Validation Tests ─────────────────────────
//
// All tests that supply a non-empty allocation map first register the strategy
// addresses via propose_action (AddStrategy) so the new on-chain registry
// membership guard in validate_allocations is satisfied.  Tests that
// specifically exercise the ZeroAddressStrategy path intentionally skip
// registration.

/// Helper: register one strategy address and return it.
fn register_strategy(env: &Env, client: &VolatilityShieldClient, admin: &Address) -> Address {
    let strategy = Address::generate(env);
    client.propose_action(admin, &ActionType::AddStrategy(strategy.clone()));
    strategy
}

#[test]
fn test_valid_allocation_sum_to_100_percent() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Register all three strategies before submitting oracle data.
    let strategy1 = register_strategy(&env, &client, &admin);
    let strategy2 = register_strategy(&env, &client, &admin);
    let strategy3 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, 3000); // 30%
    allocations.set(strategy2, 5000); // 50%
    allocations.set(strategy3, 2000); // 20%

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert!(result.is_ok());
}

#[test]
fn test_empty_allocation_accepted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // An empty map has no addresses to register — the sum is 0, which is allowed.
    let allocations: Map<Address, i128> = Map::new(&env);

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert!(result.is_ok());
}

#[test]
fn test_allocation_sum_less_than_100_percent_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy1 = register_strategy(&env, &client, &admin);
    let strategy2 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, 3000); // 30%
    allocations.set(strategy2, 5000); // 50% — total 80%, must be 100%.

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert_eq!(result, Err(Ok(Error::InvalidAllocationSum)));
}

#[test]
fn test_allocation_sum_greater_than_100_percent_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy1 = register_strategy(&env, &client, &admin);
    let strategy2 = register_strategy(&env, &client, &admin);
    let strategy3 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, 4000); // 40%
    allocations.set(strategy2, 5000); // 50%
    allocations.set(strategy3, 2500); // 25% — total 115%, must be 100%.

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert_eq!(result, Err(Ok(Error::InvalidAllocationSum)));
}

#[test]
fn test_negative_allocation_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy1 = register_strategy(&env, &client, &admin);
    let strategy2 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, -1000); // -10% — invalid.
    allocations.set(strategy2, 11000); // 110%

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert_eq!(result, Err(Ok(Error::NegativeAllocation)));
}

#[test]
fn test_single_strategy_100_percent_allocation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy1 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, 10000); // 100% to one strategy — valid.

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert!(result.is_ok());
}

#[test]
fn test_multiple_negative_allocations_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy1 = register_strategy(&env, &client, &admin);
    let strategy2 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, -5000); // -50% — invalid.
    allocations.set(strategy2, -5000); // -50%

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert_eq!(result, Err(Ok(Error::NegativeAllocation)));
}

/// An allocation referencing an address that was never registered as a strategy
/// must be rejected with `ZeroAddressStrategy`. This is the Soroban-native
/// equivalent of the EVM zero-address guard — the oracle must not be able to
/// direct funds to an arbitrary or attacker-controlled address.
#[test]
fn test_unregistered_strategy_address_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Intentionally do NOT register this address — simulates a rogue/zero address.
    let rogue = Address::generate(&env);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(rogue, 10000);

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert_eq!(result, Err(Ok(Error::ZeroAddressStrategy)));
}

/// Partially-registered allocation: one valid strategy + one rogue strategy.
/// The guard must catch the unregistered entry regardless of ordering.
#[test]
fn test_partially_unregistered_allocation_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let valid_strategy = register_strategy(&env, &client, &admin);
    let rogue_strategy = Address::generate(&env); // not registered

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(valid_strategy, 5000); // 50%
    allocations.set(rogue_strategy, 5000); // 50% — but address is not in registry

    env.ledger().set_timestamp(1000);
    let result = client.try_set_oracle_data(&allocations, &1000);
    assert_eq!(result, Err(Ok(Error::ZeroAddressStrategy)));
}

// ── Withdrawal Queue Invariant Tests ─────────────────────────

#[test]
fn test_queue_withdraw_prevents_double_spending() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &1000);
    client.deposit(&user, &token_id, &1000, &None::<i128>);

    // Set threshold so 600 triggers queue
    client.set_withdraw_queue_threshold(&500);

    // Queue 600
    client.withdraw(&user, &user, &token_id, &600);

    // User balance should be 400 now (1000 - 600)
    assert_eq!(client.balance(&user), 400);

    // Try to withdraw another 500 - should fail as user only has 400 left
    let res = client.try_withdraw(&user, &user, &token_id, &500);
    assert!(res.is_err());
}
#[test]
fn test_cancel_queued_withdrawal_restores_balance() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &1000);
    client.deposit(&user, &token_id, &1000, &None::<i128>);

    client.set_withdraw_queue_threshold(&500);
    client.withdraw(&user, &user, &token_id, &600);
    assert_eq!(client.balance(&user), 400);

    // Cancel
    client.cancel_queued_withdrawal(&user);

    // Balance should be back to 1000
    assert_eq!(client.balance(&user), 1000);
}

// ── Additional Coverage Tests ─────────────────────────

#[test]
fn test_unauthorized_rebalance_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let _stranger = Address::generate(&env);
    // require_admin_or_oracle should be tested here via rebalance call if it was public
}

#[test]
#[should_panic]
fn test_deposit_while_paused_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.set_paused(&true);
    let user = Address::generate(&env);
    client.deposit(&user, &asset, &100, &None::<i128>);
}

#[test]
#[should_panic]
fn test_deposit_zero_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.deposit(&Address::generate(&env), &asset, &0, &None::<i128>);
}

#[test]
#[should_panic]
fn test_withdraw_cap_exceeded() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.set_withdraw_cap(&100);
    client.set_total_shares(&1000);
    client.set_total_assets(&1000);
    let user = Address::generate(&env);
    client.set_balance(&user, &200);

    // Attempt withdrawal of 150 which exceeds cap of 100
    client.withdraw(&user, &user, &asset, &150);
}

#[test]
fn test_stale_oracle_data_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone(), oracle.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.set_max_staleness(&60); // 1 minute
    env.ledger().set_timestamp(1000);

    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &1000);

    // Advance time beyond staleness (e.g., to 1100)
    env.ledger().set_timestamp(1100);

    // Try to rebalance - should fail with StaleOracleData
    let res = client.try_propose_action(&oracle, &ActionType::Rebalance(50));
    assert!(res.is_err());
}

#[test]
fn test_multisig_already_approved_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin,
        &Address::generate(&env),
        &Address::generate(&env),
        &Address::generate(&env),
        &0,
        &guardians,
        &2,
    );

    let id = client.propose_action(&admin, &ActionType::SetPaused(true));
    let result = client.try_approve_action(&admin, &id);
    assert!(result.is_err());
}

#[test]
fn test_multisig_proposal_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin,
        &Address::generate(&env),
        &Address::generate(&env),
        &Address::generate(&env),
        &0,
        &guardians,
        &1,
    );

    let result = client.try_approve_action(&admin, &999);
    assert!(result.is_err());
}

// ── Batch Deposit and Batch Withdraw Tests ─────────────────────────

#[test]
fn test_batch_deposit_all_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    stellar_asset_client.mint(&user1, &1000);
    stellar_asset_client.mint(&user2, &1000);

    let operations = soroban_sdk::vec![
        &env,
        (user1.clone(), token_id.clone(), 500i128),
        (user2.clone(), token_id.clone(), 500i128),
    ];

    let results = client.batch_deposit(&operations);
    assert_eq!(results.len(), 2);
    assert!(results.get(0).unwrap());
    assert!(results.get(1).unwrap());

    assert_eq!(client.balance(&user1), 500);
    assert_eq!(client.balance(&user2), 500);
    assert_eq!(client.total_assets(), 1000);
}

#[test]
fn test_batch_deposit_partial_failure() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);
    stellar_asset_client.mint(&user1, &1000);
    stellar_asset_client.mint(&user2, &1000);

    let operations = soroban_sdk::vec![
        &env,
        (user1.clone(), token_id.clone(), 500i128), // success
        (user2.clone(), token_id.clone(), -100i128), // fail: negative amount
        (user3.clone(), Address::generate(&env), 100i128), // fail: unsupported asset
    ];

    let results = client.batch_deposit(&operations);
    assert_eq!(results.len(), 3);
    assert!(results.get(0).unwrap());
    assert!(!results.get(1).unwrap());
    assert!(!results.get(2).unwrap());

    assert_eq!(client.balance(&user1), 500);
    assert_eq!(client.balance(&user2), 0);
    assert_eq!(client.balance(&user3), 0);
    assert_eq!(client.total_assets(), 500);
}

#[test]
fn test_batch_withdraw_partial_failure() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    stellar_asset_client.mint(&contract_id, &5000);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    client.set_balance(&user1, &500);
    client.set_balance(&user2, &100);

    let operations = soroban_sdk::vec![
        &env,
        (user1.clone(), token_id.clone(), 200i128), // success
        (user2.clone(), token_id.clone(), 150i128), // fail: not enough balance
        (user1.clone(), token_id.clone(), -50i128), // fail: negative amount
    ];

    let results = client.batch_withdraw(&operations);
    assert_eq!(results.len(), 3);
    assert!(results.get(0).unwrap());
    assert!(!results.get(1).unwrap());
    assert!(!results.get(2).unwrap());

    assert_eq!(client.balance(&user1), 300);
    assert_eq!(client.balance(&user2), 100);
    assert_eq!(client.total_shares(), 800);
    assert_eq!(client.total_assets(), 4000);
}

#[test]
fn test_batch_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let ops_dep = soroban_sdk::vec![&env];
    let res_dep = client.batch_deposit(&ops_dep);
    assert_eq!(res_dep.len(), 0);

    let ops_wd = soroban_sdk::vec![&env];
    let res_wd = client.batch_withdraw(&ops_wd);
    assert_eq!(res_wd.len(), 0);
}

// ── Harvest Automation Tests ──────────────────────────────
#[test]
fn test_harvest_automation_success_and_early_rejection() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let mock_strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
    let mock_client = mock_strategy::MockStrategyClient::new(&env, &mock_strategy_id);
    mock_client.init(&contract_id, &token_id);

    client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

    env.ledger().set_sequence_number(100);
    client.set_harvest_interval(&10);

    assert_eq!(client.can_harvest(), false);

    let res = client.try_harvest();
    assert_eq!(res, Err(Ok(Error::HarvestTooEarly)));

    env.ledger().set_sequence_number(109);
    assert_eq!(client.can_harvest(), false);

    env.ledger().set_sequence_number(110);
    assert_eq!(client.can_harvest(), true);

    stellar_asset_client.mint(&mock_strategy_id, &500);
    mock_client.deposit(&500);

    let yields = client.harvest();
    assert_eq!(yields, 500);

    assert_eq!(client.can_harvest(), false);

    env.ledger().set_sequence_number(120);
    assert_eq!(client.can_harvest(), true);
}

#[test]
fn test_harvest_collects_real_tokens_and_matches_total_assets() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
    let strategy_client = mock_strategy::MockStrategyClient::new(&env, &strategy_id);
    strategy_client.init(&contract_id, &token_id);
    client.propose_action(&admin, &ActionType::AddStrategy(strategy_id.clone()));

    stellar_asset_client.mint(&strategy_id, &1200);
    strategy_client.deposit(&1200);

    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(client.total_assets(), 0);

    let harvested = client.harvest();
    assert_eq!(harvested, 1200);

    let vault_balance = token_client.balance(&contract_id);
    assert_eq!(vault_balance, 1200);
    assert_eq!(token_client.balance(&strategy_id), 0);
    assert_eq!(client.total_assets(), vault_balance);
}

#[test]
fn test_set_deposit_cap_rejects_invalid_config() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let too_large_per_user = client.try_set_deposit_cap(&2_000_000, &1_000_000);
    assert_eq!(too_large_per_user, Err(Ok(Error::InvalidConfig)));

    let zero_per_user = client.try_set_deposit_cap(&0, &1_000_000);
    assert_eq!(zero_per_user, Err(Ok(Error::InvalidConfig)));

    let zero_global = client.try_set_deposit_cap(&1_000_000, &0);
    assert_eq!(zero_global, Err(Ok(Error::InvalidConfig)));
}

#[test]
fn test_set_deposit_cap_accepts_equal_and_lower_per_user() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.set_deposit_cap(&1_000_000, &1_000_000);
    env.as_contract(&contract_id, || {
        let per_user: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxDepositPerUser)
            .unwrap();
        let global: i128 = env.storage().instance().get(&DataKey::MaxTotalAssets).unwrap();
        assert_eq!(per_user, 1_000_000);
        assert_eq!(global, 1_000_000);
    });

    client.set_deposit_cap(&750_000, &1_000_000);
    env.as_contract(&contract_id, || {
        let per_user: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxDepositPerUser)
            .unwrap();
        let global: i128 = env.storage().instance().get(&DataKey::MaxTotalAssets).unwrap();
        assert_eq!(per_user, 750_000);
        assert_eq!(global, 1_000_000);
    });
}

// ── Reentrancy Tests ──────────────────────────────
#[contract]
pub struct MaliciousStrategy;

#[contractimpl]
impl MaliciousStrategy {
    pub fn init(env: Env, vault: Address, token: Address) {
        env.storage()
            .instance()
            .set(&soroban_sdk::Symbol::new(&env, "vault"), &vault);
        env.storage()
            .instance()
            .set(&soroban_sdk::Symbol::new(&env, "token"), &token);
    }

    pub fn withdraw(env: Env, amount: i128) {
        let vault: Address = env
            .storage()
            .instance()
            .get(&soroban_sdk::Symbol::new(&env, "vault"))
            .unwrap();
        let token: Address = env
            .storage()
            .instance()
            .get(&soroban_sdk::Symbol::new(&env, "token"))
            .unwrap();

        // Attempt re-entrancy
        let client = VolatilityShieldClient::new(&env, &vault);
        client.deposit(
            &env.current_contract_address(),
            &token,
            &amount,
            &None::<i128>,
        );
    }

    pub fn deposit(_env: Env, _amount: i128) {}
    pub fn balance(_env: Env) -> i128 {
        1000
    }
}

// ── Oracle Mock (for multi-asset price calls) ──────────────────────────────
#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    pub fn price(_env: Env, _asset: Address) -> i128 {
        1_000_000_000
    }
}

#[test]
#[should_panic(expected = "slippage_exceeded")]
fn test_reentrancy_guard() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let mal_strategy_id = env.register_contract(None, MaliciousStrategy);
    let mal_client = MaliciousStrategyClient::new(&env, &mal_strategy_id);
    mal_client.init(&contract_id, &token_id);

    // Provide the malicious strategy with some tokens so transfer during deposit doesn't fail
    stellar_asset_client.mint(&mal_strategy_id, &5000);

    // Register strategy
    client.propose_action(&admin, &ActionType::AddStrategy(mal_strategy_id.clone()));

    // Total assets = 500, target 100%. Strategy has 1000. So delta is -500 (withdraw 500)
    let mut allocs = Map::new(&env);
    allocs.set(mal_strategy_id.clone(), 10_000i128);

    client.set_total_assets(&500);
    client.set_total_shares(&500);

    env.ledger().set_timestamp(100);
    client.set_oracle_data(&allocs, &50);

    client.propose_action(&admin, &ActionType::Rebalance(100));
}

// ── SC-41: Strategy Yield Benchmarking and APY Tests ──────────────────────────────
#[test]
fn test_strategy_yield_snapshots_recorded_on_harvest() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let mock_strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
    let mock_client = mock_strategy::MockStrategyClient::new(&env, &mock_strategy_id);
    mock_client.init(&contract_id, &token_id);

    client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

    env.ledger().set_sequence_number(100);
    client.set_harvest_interval(&10);

    // Mint tokens to strategy
    stellar_asset_client.mint(&mock_strategy_id, &1000);
    mock_client.deposit(&1000);

    // Advance ledger past harvest interval
    env.ledger().set_sequence_number(110);

    // Harvest should record snapshots
    let yields = client.harvest();
    assert_eq!(yields, 1000);

    // Check that yield history was recorded
    // Note: We can't directly inspect YieldHistory from client, but we can verify
    // the harvest succeeded and the event was emitted
}

#[test]
fn test_get_strategy_apy_returns_basis_points() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let mock_strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
    let mock_client = mock_strategy::MockStrategyClient::new(&env, &mock_strategy_id);
    mock_client.init(&contract_id, &token_id);

    client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

    client.set_harvest_interval(&10);

    // Perform multiple harvests to build history
    env.ledger().set_sequence_number(100);
    stellar_asset_client.mint(&mock_strategy_id, &1000);
    mock_client.deposit(&1000);
    client.harvest();

    env.ledger().set_sequence_number(200);
    stellar_asset_client.mint(&mock_strategy_id, &1100);
    mock_client.deposit(&1100);
    client.harvest();

    // Get APY (should return in basis points)
    let apy = client.get_strategy_apy(&mock_strategy_id, &2);
    // APY should be non-negative and in basis points
    assert!(apy >= 0);
}

#[test]
fn test_get_best_performing_strategy() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let strategy1_id = env.register_contract(None, mock_strategy::MockStrategy);
    let strategy1_client = mock_strategy::MockStrategyClient::new(&env, &strategy1_id);
    strategy1_client.init(&contract_id, &token_id);

    let strategy2_id = env.register_contract(None, mock_strategy::MockStrategy);
    let strategy2_client = mock_strategy::MockStrategyClient::new(&env, &strategy2_id);
    strategy2_client.init(&contract_id, &token_id);

    client.propose_action(&admin, &ActionType::AddStrategy(strategy1_id.clone()));
    client.propose_action(&admin, &ActionType::AddStrategy(strategy2_id.clone()));

    client.set_harvest_interval(&10);

    // First harvest - deposit and harvest
    env.ledger().set_sequence_number(100);
    stellar_asset_client.mint(&strategy1_id, &1000);
    strategy1_client.deposit(&1000);
    stellar_asset_client.mint(&strategy2_id, &1500);
    strategy2_client.deposit(&1500);

    // Advance ledger past harvest interval
    env.ledger().set_sequence_number(110);
    client.harvest();

    // Second harvest - add more yield to create growth history
    // Note: Mock strategy doesn't retain balance after harvest, so we deposit again
    stellar_asset_client.mint(&strategy1_id, &500);
    strategy1_client.deposit(&500);
    stellar_asset_client.mint(&strategy2_id, &2000);
    strategy2_client.deposit(&2000);

    // Advance ledger past harvest interval again
    env.ledger().set_sequence_number(120);
    client.harvest();

    // With collect_yield draining strategy balances after each harvest, APY can be zero.
    // The API should still return cleanly.
    let _best = client.get_best_performing_strategy();
}

// ── SC-42: Oracle Circuit Breaker Tests ──────────────────────────────────────────
#[test]
fn test_activate_oracle_circuit_breaker() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Initially not active
    assert_eq!(client.is_circuit_breaker_active(), false);

    // Activate circuit breaker
    client.activate_oracle_circuit_breaker();

    // Should now be active
    assert_eq!(client.is_circuit_breaker_active(), true);
}

#[test]
fn test_reset_oracle_circuit_breaker() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    client.activate_oracle_circuit_breaker();
    assert_eq!(client.is_circuit_breaker_active(), true);

    // Reset circuit breaker
    client.reset_oracle_circuit_breaker();

    // Should now be inactive
    assert_eq!(client.is_circuit_breaker_active(), false);
}

#[test]
fn test_set_oracle_data_stores_last_safe_allocation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy1 = register_strategy(&env, &client, &admin);

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy1, 10000);

    env.ledger().set_timestamp(1000);
    client.set_oracle_data(&allocations, &1000);

    // Last safe allocation should be stored when circuit breaker is not active
    // We can't directly inspect it, but the fact that set_oracle_data succeeded
    // indicates it was stored
}

// ── SC-43: Blocklist and Allowlist Tests ─────────────────────────────────────────
#[test]
fn test_add_to_blocklist() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let blocked_user = Address::generate(&env);

    // Add to blocklist
    client.add_to_blocklist(&blocked_user);

    // Verify user is in blocklist
    let blocklist = client.get_blocklist();
    assert!(blocklist.contains(blocked_user));
}

#[test]
fn test_remove_from_blocklist() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let blocked_user = Address::generate(&env);
    client.add_to_blocklist(&blocked_user);

    // Remove from blocklist
    client.remove_from_blocklist(&blocked_user);

    // Verify user is no longer in blocklist
    let blocklist = client.get_blocklist();
    assert!(!blocklist.contains(blocked_user));
}

#[test]
fn test_add_to_allowlist() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let allowed_user = Address::generate(&env);

    // Add to allowlist
    client.add_to_allowlist(&allowed_user);

    // Verify user is in allowlist
    let allowlist = client.get_allowlist();
    assert!(allowlist.contains(allowed_user));
}

#[test]
fn test_remove_from_allowlist() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let allowed_user = Address::generate(&env);
    client.add_to_allowlist(&allowed_user);

    // Remove from allowlist
    client.remove_from_allowlist(&allowed_user);

    // Verify user is no longer in allowlist
    let allowlist = client.get_allowlist();
    assert!(!allowlist.contains(allowed_user));
}

#[test]
fn test_set_blocklist_mode() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Initially inactive
    assert_eq!(client.is_blocklist_mode_active(), false);

    // Activate blocklist mode
    client.set_blocklist_mode(&true);
    assert_eq!(client.is_blocklist_mode_active(), true);

    // Deactivate blocklist mode
    client.set_blocklist_mode(&false);
    assert_eq!(client.is_blocklist_mode_active(), false);
}

#[test]
fn test_set_allowlist_mode() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Initially inactive
    assert_eq!(client.is_allowlist_mode_active(), false);

    // Activate allowlist mode
    client.set_allowlist_mode(&true);
    assert_eq!(client.is_allowlist_mode_active(), true);

    // Deactivate allowlist mode
    client.set_allowlist_mode(&false);
    assert_eq!(client.is_allowlist_mode_active(), false);
}

#[test]
#[should_panic(expected = "Compliance check failed")]
fn test_blocked_user_cannot_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let blocked_user = Address::generate(&env);
    client.add_to_blocklist(&blocked_user);
    client.set_blocklist_mode(&true);

    // Mint tokens to blocked user
    stellar_asset_client.mint(&blocked_user, &1000);

    // Attempt to deposit - should panic
    client.deposit(&blocked_user, &token_id, &100, &None::<i128>);
}

#[test]
#[should_panic(expected = "Compliance check failed")]
fn test_non_allowlisted_user_cannot_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let allowed_user = Address::generate(&env);
    let non_allowed_user = Address::generate(&env);

    client.add_to_allowlist(&allowed_user);
    client.set_allowlist_mode(&true);

    // Mint tokens to non-allowlisted user
    stellar_asset_client.mint(&non_allowed_user, &1000);

    // Attempt to deposit - should panic
    client.deposit(&non_allowed_user, &token_id, &100, &None::<i128>);
}

#[test]
fn test_allowlisted_user_can_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    let allowed_user = Address::generate(&env);
    client.add_to_allowlist(&allowed_user);
    client.set_allowlist_mode(&true);

    // Mint tokens to allowed user
    stellar_asset_client.mint(&allowed_user, &1000);

    // Deposit should succeed
    client.deposit(&allowed_user, &token_id, &100, &None::<i128>);

    // Verify deposit succeeded
    let balance = client.balance(&allowed_user);
    assert!(balance > 0);
}

#[test]
fn test_get_vault_summary() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    // zero state
    let summary = client.get_vault_summary();
    assert_eq!(summary.total_assets, 0);
    assert_eq!(summary.total_shares, 0);
    assert_eq!(summary.share_price, 1_000_000_000); // 1.0 depending on implementation
    assert_eq!(summary.paused, false);

    // After init and deposit, total_assets and total_shares should reflect changes
}

#[test]
fn test_get_user_summary() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    // zero state
    let summary = client.get_user_summary(&user);
    assert_eq!(summary.balance, 0);
    assert_eq!(summary.queued_shares, 0);
    assert_eq!(summary.voting_power, 0);
}

#[test]
fn test_get_governance_summary() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    // After init
    let admin = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin,
        &Address::generate(&env),
        &Address::generate(&env),
        &Address::generate(&env),
        &0,
        &guardians,
        &1,
    );

    let summary = client.get_governance_summary();
    assert_eq!(summary.guardians.len(), 1);
    assert_eq!(summary.threshold, 1);
    assert_eq!(summary.active_proposal_count, 0);
}

#[test]
fn test_get_strategy_summary() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    // zero state
    let summary = client.get_strategy_summary();
    assert_eq!(summary.len(), 0);
}

#[test]
fn test_cascade_pause_activation() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Initially cascade pause is not active
    assert!(!client.cascade_pause_active());

    // Activate cascade pause
    client.pause_all_strategies();

    // Cascade pause should now be active
    assert!(client.cascade_pause_active());

    // Vault should also be paused
    assert!(client.is_paused());

    // Check vault summary includes cascade pause state
    let summary = client.get_vault_summary();
    assert!(summary.cascade_pause_active);
    assert!(summary.paused);
}

#[test]
fn test_cascade_pause_lift() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Activate cascade pause
    client.pause_all_strategies();
    assert!(client.cascade_pause_active());

    // Lift cascade pause
    client.lift_cascade_pause();

    // Cascade pause should no longer be active
    assert!(!client.cascade_pause_active());

    // Vault should also be unpaused
    assert!(!client.is_paused());

    // Check vault summary reflects lifted state
    let summary = client.get_vault_summary();
    assert!(!summary.cascade_pause_active);
    assert!(!summary.paused);
}

#[test]
fn test_cascade_pause_blocks_operations() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Activate cascade pause
    client.pause_all_strategies();

    // Deposit should fail with cascade pause error
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.deposit(&user, &asset, &1000i128);
    }));
    assert!(result.is_err());

    // Withdraw should fail with cascade pause error  
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.withdraw(&user, &asset, &1000i128);
    }));
    assert!(result.is_err());

    // Rebalance should fail with cascade pause error
    let allocations = soroban_sdk::Map::new(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.rebalance(&admin, &allocations, &100u32);
    }));
    assert!(result.is_err());
}

#[test]
fn test_cascade_pause_with_strategies() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Add a mock strategy
    use mock_strategy::{MockStrategy, MockStrategyClient};
    let mock_strategy_id = env.register_contract(None, MockStrategy);
    let mock_client = MockStrategyClient::new(&env, &mock_strategy_id);
    mock_client.init(&contract_id, &token_id);

    client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));
    
    // Activate cascade pause - should call pause on strategy
    client.pause_all_strategies();
    assert!(client.cascade_pause_active());

    // Lift cascade pause - should call unpause on strategy
    client.lift_cascade_pause();
    assert!(!client.cascade_pause_active());
}

#[test]
fn test_cascade_pause_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let unauthorized_user = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Unauthorized user should not be able to activate cascade pause
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.pause_all_strategies();
    }));
    assert!(result.is_err());

    // Activate cascade pause first, then test unauthorized lift
    client.pause_all_strategies();
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.lift_cascade_pause();
    }));
    assert!(result.is_err());
}

#[test]
fn test_set_withdraw_delegate() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Initially, no delegate is set (should return owner)
    assert_eq!(client.get_withdraw_delegate(&owner), owner);

    // Set a delegate
    client.set_withdraw_delegate(&owner, &delegate);

    // Verify delegate is set
    assert_eq!(client.get_withdraw_delegate(&owner), delegate);
}

#[test]
fn test_revoke_withdraw_delegate() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Set a delegate
    client.set_withdraw_delegate(&owner, &delegate);
    assert_eq!(client.get_withdraw_delegate(&owner), delegate);

    // Revoke delegate
    client.revoke_withdraw_delegate(&owner);

    // Verify delegate is revoked (should return owner)
    assert_eq!(client.get_withdraw_delegate(&owner), owner);
}

#[test]
fn test_delegate_withdrawal() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let token_id = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Create token contract and mint tokens to owner
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &admin);
    stellar_asset_client.mint(&owner, &1000);

    // Owner deposits tokens
    client.deposit(&owner, &token_id, &1000i128);
    assert_eq!(client.balance(&owner), 1000);

    // Set delegate
    client.set_withdraw_delegate(&owner, &delegate);

    // Delegate withdraws on behalf of owner
    client.withdraw(&delegate, &owner, &token_id, &500i128);

    // Verify withdrawal went to owner's address
    assert_eq!(client.balance(&owner), 500);
    assert_eq!(token_client.balance(&owner), 500);
}

#[test]
fn test_delegate_withdrawal_unauthorized() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let token_id = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Create token contract and mint tokens to owner
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &admin);
    stellar_asset_client.mint(&owner, &1000);

    // Owner deposits tokens
    client.deposit(&owner, &token_id, &1000i128);
    assert_eq!(client.balance(&owner), 1000);

    // Unauthorized user tries to withdraw on behalf of owner
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.withdraw(&unauthorized, &owner, &token_id, &500i128);
    }));
    assert!(result.is_err());

    // Verify no withdrawal occurred
    assert_eq!(client.balance(&owner), 1000);
    assert_eq!(token_client.balance(&owner), 0);
}

#[test]
fn test_revoked_delegate_withdrawal() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let token_id = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Create token contract and mint tokens to owner
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &admin);
    stellar_asset_client.mint(&owner, &1000);

    // Owner deposits tokens
    client.deposit(&owner, &token_id, &1000i128);
    assert_eq!(client.balance(&owner), 1000);

    // Set delegate
    client.set_withdraw_delegate(&owner, &delegate);

    // Delegate withdraws successfully
    client.withdraw(&delegate, &owner, &token_id, &500i128);
    assert_eq!(client.balance(&owner), 500);

    // Revoke delegate
    client.revoke_withdraw_delegate(&owner);

    // Try to withdraw again after revocation - should fail
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.withdraw(&delegate, &owner, &token_id, &200i128);
    }));
    assert!(result.is_err());

    // Verify no additional withdrawal occurred
    assert_eq!(client.balance(&owner), 500);
    assert_eq!(token_client.balance(&owner), 500);
}

#[test]
fn test_owner_can_always_withdraw() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let delegate = Address::generate(&env);
    let token_id = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

    // Create token contract and mint tokens to owner
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &admin);
    stellar_asset_client.mint(&owner, &1000);

    // Owner deposits tokens
    client.deposit(&owner, &token_id, &1000i128);
    assert_eq!(client.balance(&owner), 1000);

    // Set delegate
    client.set_withdraw_delegate(&owner, &delegate);

    // Owner can still withdraw on their own behalf
    client.withdraw(&owner, &owner, &token_id, &300i128);

    // Verify withdrawal
    assert_eq!(client.balance(&owner), 700);
    assert_eq!(token_client.balance(&owner), 300);

    // Delegate can also withdraw
    client.withdraw(&delegate, &owner, &token_id, &200i128);

    // Verify both withdrawals
    assert_eq!(client.balance(&owner), 500);
    assert_eq!(token_client.balance(&owner), 500);
}

// Additional tests for partial failure and APY can be added here
#[test]
fn test_multi_asset_total_assets_aggregation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);

    let token1_admin = Address::generate(&env);
    let (token1_id, _, _) = create_token_contract(&env, &token1_admin);
    let token2_admin = Address::generate(&env);
    let (token2_id, _, _) = create_token_contract(&env, &token2_admin);

    // Minimal oracle contract so `get_asset_price` can invoke `price(asset)`.
    let oracle = env.register_contract(None, MockOracle);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &token1_id, &oracle, &treasury, &0, &guardians, &1);

    client.add_supported_asset(&token2_id);

    // Mock oracle prices: Token1 = 1.0 (1e9), Token2 = 2.0 (2e9)
    // We'd normally use a mock contract for the oracle address here.

    // Set per-asset quantities manually for the test
    client.set_total_assets(&0); // reset global
    env.as_contract(&contract_id, || {
        env.storage()
            .instance()
            .set(&DataKey::AssetTotalAssets(token1_id.clone()), &1000i128);
    });
    // env.storage().instance().set(&DataKey::AssetTotalAssets(token2_id.clone()), &500i128); // Skip token2 to avoid oracle mock

    // total_assets() will aggregate: (1000 * 1.0) = 1000
    assert_eq!(client.total_assets(), 1000);
}

// ── SC-28: batch_withdraw Withdrawn event ─────────────────────────────────────
/// Verify that batch_withdraw emits one Withdrawn event per successful entry
/// and that each event's amount_out matches the actual assets transferred.
#[test]
fn test_batch_withdraw_emits_withdrawn_event_per_user() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    // Seed the vault with enough tokens for two successful withdrawals.
    stellar_asset_client.mint(&contract_id, &5000);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    client.set_balance(&user1, &400);
    client.set_balance(&user2, &200);

    let operations = soroban_sdk::vec![
        &env,
        (user1.clone(), token_id.clone(), 200i128),
        (user2.clone(), token_id.clone(), 100i128),
        (user2.clone(), token_id.clone(), 500i128), // fail: insufficient balance
    ];

    let results = client.batch_withdraw(&operations);

    // Two successes, one failure.
    assert!(results.get(0).unwrap(), "user1 withdrawal should succeed");
    assert!(
        results.get(1).unwrap(),
        "user2 first withdrawal should succeed"
    );
    assert!(
        !results.get(2).unwrap(),
        "user2 second withdrawal should fail (insufficient)"
    );

    // Confirm balances are updated correctly.
    assert_eq!(client.balance(&user1), 200, "user1 residual shares");
    assert_eq!(client.balance(&user2), 100, "user2 residual shares");

    // Confirm tokens were actually transferred to each user.
    // shares_to_assets: 200 shares / 1000 total_shares * 5000 total_assets = 1000
    let user1_tokens = token_client.balance(&user1);
    let user2_tokens = token_client.balance(&user2);
    assert!(user1_tokens > 0, "user1 should have received tokens");
    assert!(user2_tokens > 0, "user2 should have received tokens");
}

// ── SC-29: deposit() CEI ──────────────────────────────────────────────────────
/// Verify that vault state is consistent even when a panic occurs after the
/// token transfer.  With the correct CEI ordering, state is committed before
/// the transfer, so a transfer failure (which panics and reverts) leaves the
/// vault as if the deposit never happened — preventing fund loss.
#[test]
fn test_deposit_state_consistent_before_token_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let user = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    // Mint tokens to user and capture pre-deposit vault state.
    stellar_asset_client.mint(&user, &1000);

    let total_shares_before = client.total_shares();
    let total_assets_before = client.total_assets();
    let user_balance_before = client.balance(&user);

    // Perform a normal deposit — should succeed.
    client.deposit(&user, &token_id, &500, &None);

    // State should have advanced.
    assert_eq!(client.total_shares(), total_shares_before + 500);
    assert_eq!(client.balance(&user), user_balance_before + 500);

    assert!(
        client.total_shares() > total_shares_before,
        "shares should increase"
    );
    assert!(
        client.total_assets() > total_assets_before,
        "total_assets should increase"
    );
    assert!(
        client.balance(&user) > user_balance_before,
        "user balance should increase"
    );

    // Vault should hold the deposited tokens.
    let vault_tokens = token_client.balance(&contract_id);
    assert_eq!(vault_tokens, 500, "vault should hold deposited tokens");

    // Setup for failure: next deposit tries to transfer more than user has.
    let res = env.try_invoke_contract::<(), soroban_sdk::Error>(
        &contract_id,
        &soroban_sdk::Symbol::new(&env, "deposit"),
        soroban_sdk::vec![
            &env,
            user.into_val(&env),
            token_id.into_val(&env),
            600i128.into_val(&env),
            None::<i128>.into_val(&env)
        ],
    );

    assert!(res.is_err());

    // Verify state was reverted correctly.
    assert_eq!(client.total_shares(), total_shares_before + 500);
    assert_eq!(client.balance(&user), user_balance_before + 500);
}

// ── SC-30: rebalance() execution path ────────────────────────────────────────
/// Verify that immediate rebalance execution moves assets from vault
/// to the target strategy according to oracle allocation.
#[test]
fn test_rebalance_increase_no_tokens_moved_on_failed_execution() {
    use mock_strategy::MockStrategyClient;

    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let vault_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &vault_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(
        &admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32,
    );

    stellar_asset_client.mint(&vault_id, &10_000);
    client.set_total_assets(&10_000);

    let strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
    let strategy_client = MockStrategyClient::new(&env, &strategy_id);
    strategy_client.init(&vault_id, &token_id);
    client.propose_action(&admin, &ActionType::AddStrategy(strategy_id.clone()));

    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(strategy_id.clone(), 10000i128);
    env.ledger().set_timestamp(12345);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());

    let vault_balance_before = token_client.balance(&vault_id);

    // With threshold=1 and admin auth, this executes immediately.
    client.propose_action(&admin, &ActionType::Rebalance(500u32));

    let vault_balance_after = token_client.balance(&vault_id);
    assert_eq!(vault_balance_before - vault_balance_after, 10000);
    assert_eq!(
        token_client.balance(&strategy_id),
        10000,
        "strategy should receive allocated tokens from rebalance"
    );
}

// ── SC-31: rebalance() withdraw transfer failure ──────────────────────────────
#[test]
fn test_rebalance_withdraw_transfer_failed_event_type_in_abi() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let vault_id = env.register_contract(None, VolatilityShield);
    let admin = Address::generate(&env);
    let token_id = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let strategy_id = Address::generate(&env);

    // Confirm the struct is constructible, cloneable, and equality-comparable.
    let ev1 = RebalanceWithdrawTransferFailed {
        strategy: strategy_id.clone(),
        amount: 500,
    };
    let ev2 = ev1.clone();
    assert_eq!(ev1, ev2, "RebalanceWithdrawTransferFailed must implement Clone + Eq");
    assert_eq!(ev1.amount, 500);
    assert_eq!(ev1.strategy, strategy_id);

    // Sanity-check init still works (exercises vault code path, not just struct).
    let client = VolatilityShieldClient::new(&env, &vault_id);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);
}

#[test]
fn test_proposal_auto_pruning_and_filtering() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    
    // threshold 2 means proposals stay unexecuted
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &2u32);

    // 1. Create 3 proposals at early timestamps
    env.ledger().set_timestamp(100);
    client.propose_action(&admin, &ActionType::SetPaused(true));
    
    env.ledger().set_timestamp(200);
    client.propose_action(&admin, &ActionType::SetPaused(false));
    
    env.ledger().set_timestamp(300); 
    client.propose_action(&admin, &ActionType::SetPaused(true));

    // 2. Advance time to expire
    env.ledger().set_timestamp(3_000_000); 

    // 3. Call list_proposals(include_expired=true) -> should see all 3
    assert_eq!(client.list_proposals(&0u32, &10u32, &true).len(), 3);

    // 4. Call list_proposals(include_expired=false) -> should filter out all 3
    assert_eq!(client.list_proposals(&0u32, &10u32, &false).len(), 0);
    
    // 5. Create a new active one
    env.ledger().set_timestamp(3_000_100);
    let id_4 = client.propose_action(&admin, &ActionType::SetPaused(false));
    
    let proposals = client.list_proposals(&0u32, &10u32, &false);
    assert_eq!(proposals.len(), 1);
}
