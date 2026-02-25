#![cfg(test)]
use super::*;
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{testutils::Address as _, Address, Env, Map};

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

    client.init(&admin, &asset, &oracle, &treasury, &500u32);

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

    let result = client.try_init(&admin, &asset, &oracle, &treasury, &500u32);
    assert!(result.is_ok());

    let result = client.try_init(&admin, &asset, &oracle, &treasury, &500u32);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
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
    client.init(&admin, &asset, &oracle, &treasury, &0u32);

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
    client.init(&admin, &asset, &oracle, &treasury, &0u32);

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

    client.init(&admin, &asset, &oracle, &treasury, &0u32);
    assert_eq!(client.read_admin(), admin);

    client.add_strategy(&strategy);
    let strategies = client.get_strategies();
    assert_eq!(strategies.len(), 1);
    assert_eq!(strategies.get(0).unwrap(), strategy);

    let strategy_2 = Address::generate(&env);
    client.add_strategy(&strategy_2);
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
fn test_take_fees() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    let deposit_amount = 1000;
    let remaining = client.take_fees(&deposit_amount);
    assert_eq!(remaining, 950);
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

    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    let user = Address::generate(&env);
    let deposit_amount = 1000;
    stellar_asset_client.mint(&user, &deposit_amount);

    client.deposit(&user, &deposit_amount);

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

    client.init(&admin, &token_id, &oracle, &treasury, &0u32);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user = Address::generate(&env);
    client.set_balance(&user, &100);

    stellar_asset_client.mint(&contract_id, &5000);

    client.withdraw(&user, &50);

    assert_eq!(client.balance(&user), 50);
    assert_eq!(client.total_shares(), 950);
    assert_eq!(client.total_assets(), 4750);
    assert_eq!(token_client.balance(&user), 250);
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

    client.init(&admin, &asset, &oracle, &treasury, &0u32);

    let allocations: Map<Address, i128> = Map::new(&env);
    client.rebalance(&allocations);
}

mod integration {
    use super::*;
    use mock_strategy::MockStrategyClient;

    fn create_mock_strategy(env: &Env) -> (Address, MockStrategyClient) {
        let mock_strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
        let mock_client = MockStrategyClient::new(env, &mock_strategy_id);
        (mock_strategy_id, mock_client)
    }

    #[test]
    fn test_rebalance_deposit_into_mock_strategy() {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) =
            create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);

        client.init(&admin, &token_id, &oracle, &treasury, &0u32);

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        client.add_strategy(&mock_strategy_id);

        stellar_asset_client.mint(&contract_id, &1000);
        client.set_total_assets(&1000);
        client.set_total_shares(&1000);

        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id.clone(), 500);

        client.rebalance(&allocations);

        assert_eq!(mock_client.balance(), 500);
        assert_eq!(token_client.balance(&contract_id), 500);
        assert_eq!(token_client.balance(&mock_strategy_id), 500);
    }

    #[test]
    fn test_rebalance_withdraw_from_mock_strategy() {
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

        client.init(&admin, &token_id, &oracle, &treasury, &0u32);

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        client.add_strategy(&mock_strategy_id);

        stellar_asset_client.mint(&contract_id, &1000);
        client.set_total_assets(&1000);
        client.set_total_shares(&1000);

        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id.clone(), 500);
        client.rebalance(&allocations);

        assert_eq!(mock_client.balance(), 500);

        let mut allocations2: Map<Address, i128> = Map::new(&env);
        allocations2.set(mock_strategy_id.clone(), 200);
        client.rebalance(&allocations2);

        assert_eq!(mock_client.balance(), 200);
        assert_eq!(token_client.balance(&contract_id), 800);
        assert_eq!(token_client.balance(&mock_strategy_id), 200);
    }

    #[test]
    fn test_rebalance_with_multiple_strategies() {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) =
            create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);

        client.init(&admin, &token_id, &oracle, &treasury, &0u32);

        let (mock_strategy_id1, mock_client1) = create_mock_strategy(&env);
        let (mock_strategy_id2, mock_client2) = create_mock_strategy(&env);

        client.add_strategy(&mock_strategy_id1);
        client.add_strategy(&mock_strategy_id2);

        stellar_asset_client.mint(&contract_id, &1000);
        client.set_total_assets(&1000);
        client.set_total_shares(&1000);

        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id1.clone(), 300);
        allocations.set(mock_strategy_id2.clone(), 400);
        client.rebalance(&allocations);

        assert_eq!(mock_client1.balance(), 300);
        assert_eq!(mock_client2.balance(), 400);
        assert_eq!(token_client.balance(&contract_id), 300);
        assert_eq!(token_client.balance(&mock_strategy_id1), 300);
        assert_eq!(token_client.balance(&mock_strategy_id2), 400);
    }

    #[test]
    fn test_mock_strategy_deposit_withdraw_flow() {
        let env = Env::default();

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        assert_eq!(mock_client.balance(), 0);

        mock_client.deposit(&100);
        assert_eq!(mock_client.balance(), 100);

        mock_client.deposit(&50);
        assert_eq!(mock_client.balance(), 150);

        mock_client.withdraw(&75);
        assert_eq!(mock_client.balance(), 75);

        mock_client.withdraw(&75);
        assert_eq!(mock_client.balance(), 0);
    }
}

// ── Pause Mechanism Tests ─────────────────────────

#[test]
fn test_set_paused_toggles_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    // Default: not paused
    assert!(!client.is_paused());

    // Pause
    client.set_paused(&true);
    assert!(client.is_paused());

    // Unpause
    client.set_paused(&false);
    assert!(!client.is_paused());
}

#[test]
#[should_panic(expected = "ContractPaused")]
fn test_deposit_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &500u32);

    // Pause the vault
    client.set_paused(&true);

    // Deposit should be blocked
    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &1000);
    client.deposit(&user, &500);
}

#[test]
#[should_panic(expected = "ContractPaused")]
fn test_withdraw_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    // Set up a balance for user
    client.set_total_shares(&100);
    client.set_total_assets(&100);
    let user = Address::generate(&env);
    client.set_balance(&user, &50);
    stellar_asset_client.mint(&contract_id, &100);

    // Pause the vault
    client.set_paused(&true);

    // Withdraw should be blocked
    client.withdraw(&user, &10);
}

#[test]
fn test_upgrade_and_migrate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    // Initial version should be 1
    assert_eq!(client.version(), 1);

    // Migrate to version 2
    client.migrate(&2);
    assert_eq!(client.version(), 2);
}

#[cfg(test)]
mod fuzz_tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn fuzz_convert_to_shares(
            total_shares in 0i128..1_000_000_000_000_000_000,
            total_assets in 0i128..1_000_000_000_000_000_000,
            amount in 0i128..1_000_000_000_000_000_000,
        ) {
            let env = Env::default();
            let contract_id = env.register_contract(None, VolatilityShield);
            let client = VolatilityShieldClient::new(&env, &contract_id);
            
            let admin = Address::generate(&env);
            let asset = Address::generate(&env);
            let oracle = Address::generate(&env);
            let treasury = Address::generate(&env);
            client.init(&admin, &asset, &oracle, &treasury, &0u32);

            client.set_total_shares(&total_shares);
            client.set_total_assets(&total_assets);

            // Verify no unexpected panic on positive valid inputs up to large ranges.
            let _shares = client.convert_to_shares(&amount);
        }

        #[test]
        fn fuzz_convert_to_assets(
            total_shares in 0i128..1_000_000_000_000_000_000,
            total_assets in 0i128..1_000_000_000_000_000_000,
            shares in 0i128..1_000_000_000_000_000_000,
        ) {
            let env = Env::default();
            let contract_id = env.register_contract(None, VolatilityShield);
            let client = VolatilityShieldClient::new(&env, &contract_id);
            
            let admin = Address::generate(&env);
            let asset = Address::generate(&env);
            let oracle = Address::generate(&env);
            let treasury = Address::generate(&env);
            client.init(&admin, &asset, &oracle, &treasury, &0u32);

            client.set_total_shares(&total_shares);
            client.set_total_assets(&total_assets);

            // Verify no unexpected panic on positive valid inputs up to large ranges.
            let _assets = client.convert_to_assets(&shares);
        }
    }
}
