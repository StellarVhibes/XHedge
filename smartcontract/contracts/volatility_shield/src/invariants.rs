#![cfg(test)]
use super::*;
use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{Address, Env};

extern crate std;

fn setup_test_env() -> (Env, VolatilityShieldClient<'static>, Address, Address) {
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

    (env, client, admin, asset)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn test_total_shares_matches_sum_of_balances(
        amounts in prop::collection::vec(1i128..1_000_000i128, 1..10)
    ) {
        let (env, client, _admin, _asset) = setup_test_env();
        let mut total_expected_shares = 0i128;
        let mut users = Vec::new(&env);

        for amount in amounts {
            let user = Address::generate(&env);
            users.push_back(user.clone());
            client.set_total_assets(&(client.total_assets() + amount));
            let shares = client.convert_to_shares(&amount);
            client.set_balance(&user, &shares);
            total_expected_shares += shares;
            client.set_total_shares(&total_expected_shares);
        }

        assert_eq!(client.total_shares(), total_expected_shares);

        // Verify individual balances sum to total_shares
        let mut sum_balances = 0i128;
        for user in users.iter() {
            sum_balances += client.balance(&user);
        }
        assert_eq!(sum_balances, client.total_shares());
    }

    #[test]
    fn test_conversion_invariants(amount in 1i128..1_000_000_000i128) {
        let (_env, client, _admin, _asset) = setup_test_env();

        // Initial state
        assert_eq!(client.convert_to_shares(&amount), amount);
        assert_eq!(client.convert_to_assets(&amount), amount);

        // State with some growth
        client.set_total_assets(&2000);
        client.set_total_shares(&1000);

        let shares = client.convert_to_shares(&amount);
        let assets_back = client.convert_to_assets(&shares);

        // assets_back should be <= amount due to rounding down
        assert!(assets_back <= amount);
        // Loss should be minimal (less than 1 unit in this simple linear case)
        assert!(amount - assets_back <= 1);
    }

    #[test]
    fn test_deposit_withdraw_invariant(amount in 1i128..1_000_000i128) {
        // This is more of a state machine test, but simplified here
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, _token_client) = create_token_contract(&env, &token_admin);

        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

        let user = Address::generate(&env);
        stellar_asset_client.mint(&user, &amount);

        client.deposit(&user, &token_id, &amount, &None::<i128>);
        let shares = client.balance(&user);

        assert_eq!(client.total_shares(), shares);

        client.withdraw(&user, &user, &shares, &None::<i128>);
        assert_eq!(client.balance(&user), 0);
        assert_eq!(client.total_shares(), 0);
    }

    // 1. Guardian threshold is always <= guardian count
    // This invariant ensures we cannot set a threshold requiring more signatures than available guardians.
    #[test]
    fn test_guardian_threshold_invariant(
        guardians_to_add in 1u32..10u32,
        threshold_to_set in 1u32..20u32
    ) {
        let (env, client, _admin, _asset) = setup_test_env();
        for _ in 0..guardians_to_add {
            client.add_guardian(&Address::generate(&env));
        }
        let guardians_count = client.get_guardians().len();

        let res = client.try_set_threshold(&threshold_to_set);
        if threshold_to_set > guardians_count {
            assert!(res.is_err());
        } else {
            assert!(res.is_ok());
        }
        // Core invariant: stored threshold <= total guardians
        assert!(client.get_threshold() <= client.get_guardians().len());
    }

    // 2. Total queued shares never exceed total shares
    // This property ensures the withdrawal queue cannot theoretically demand more shares than exist in the system.
    #[test]
    fn test_total_queued_shares_never_exceed_total_shares(
        deposit_shares in prop::collection::vec(1i128..1_000i128, 1..10)
    ) {
        let (env, client, _admin, _asset) = setup_test_env();
        client.set_withdraw_queue_threshold(&0); // Force queue

        let mut total_shares = 0;
        for &s in deposit_shares.iter() { total_shares += s; }
        client.set_total_shares(&total_shares);
        client.set_total_assets(&total_shares);

        for &s in deposit_shares.iter() {
            let u = Address::generate(&env);
            client.set_balance(&u, &s);
            let _ = client.try_queue_withdraw(&u, &u, &s);
        }

        let mut queued = 0;
        for w in client.get_pending_withdrawals().iter() {
            queued += w.shares;
        }

        assert!(queued <= client.total_shares());
    }

    // 3. Sum of per-strategy allocations always equals 100% after rebalance
    // Validates that oracle allocations must tightly equal 10,000 basis points (100%), rejecting invalid states.
    #[test]
    fn test_rebalance_allocations_sum_to_100_percent(
        alloc1 in 0i128..15_000i128,
        alloc2 in 0i128..15_000i128
    ) {
        let (env, client, admin, _asset) = setup_test_env();
        let s1 = Address::generate(&env);
        let s2 = Address::generate(&env);
        client.propose_action(&admin, &ActionType::AddStrategy(s1.clone()));
        client.propose_action(&admin, &ActionType::AddStrategy(s2.clone()));

        let mut allocations = soroban_sdk::Map::new(&env);
        allocations.set(s1.clone(), alloc1);
        allocations.set(s2.clone(), alloc2);

        env.ledger().set_timestamp(100);
        let timestamp = 50; // Valid timestamp compared to last update 0
        let res = client.try_set_oracle_data(&allocations, &timestamp);

        let sum = alloc1 + alloc2;
        if sum == 10_000 {
            assert!(res.is_ok());
        } else {
            assert!(res.is_err());
        }
    }

    // 4. Share price is monotonically non-decreasing after harvest
    // Harvesting yields implies adding to total assets while shares remain constant, so price per share must >= previous price.
    #[test]
    fn test_share_price_monotonically_non_decreasing_after_harvest(
        yield_amount in 0i128..1_000_000i128
    ) {
        use mock_strategy::{MockStrategy, MockStrategyClient};

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
        client.init(&admin, &token_id, &oracle, &treasury, &0u32, &guardians, &1u32);

        let mock_strategy_id = env.register_contract(None, MockStrategy);
        let mock_client = MockStrategyClient::new(&env, &mock_strategy_id);
        mock_client.init(&contract_id, &token_id);

        client.propose_action(&admin, &ActionType::AddStrategy(mock_strategy_id.clone()));

        client.set_total_shares(&1000);
        client.set_total_assets(&1000);

        let price_before = client.get_share_price();

        stellar_asset_client.mint(&mock_strategy_id, &yield_amount);
        mock_client.deposit(&yield_amount);

        let _ = client.harvest();

        let price_after = client.get_share_price();
        assert!(price_after >= price_before);
    }

    // 5. Deposit cap enforcement
    // A single user cannot exceed MaxDepositPerUser upon making a deposit.
    #[test]
    fn test_deposit_cap_enforcement(
        cap in 100i128..10_000i128,
        deposit_amount in 1i128..20_000i128
    ) {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let guardians = soroban_sdk::vec![&env, admin.clone()];
        client.init(&admin, &token_id, &Address::generate(&env), &Address::generate(&env), &0, &guardians, &1);

        client.set_deposit_cap(&cap, &100_000_000_000i128);

        let user = Address::generate(&env);
        client.set_balance(&user, &0);
        stellar_asset_client.mint(&user, &deposit_amount);

        let res = client.try_deposit(&user, &token_id, &deposit_amount, &None::<i128>);
        if deposit_amount > cap {
            assert!(res.is_err());
        } else {
            assert!(res.is_ok());
        }

        assert!(client.balance(&user) <= cap);
    }
}

// Helper for create_token_contract (don't want to duplicate too much logic but need it for standalone)
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
fn create_token_contract<'a>(
    env: &Env,
    admin: &Address,
) -> (Address, StellarAssetClient<'a>, TokenClient<'a>) {
    let contract_id = env.register_stellar_asset_contract_v2(admin.clone());
    let stellar_asset_client = StellarAssetClient::new(env, &contract_id.address());
    let token_client = TokenClient::new(env, &contract_id.address());
    (contract_id.address(), stellar_asset_client, token_client)
}
