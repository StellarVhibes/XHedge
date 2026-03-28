#![cfg(test)]
use super::*;
use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

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
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn test_total_shares_matches_sum_of_balances(
        amounts in prop::collection::vec(1i128..1_000_000i128, 1..10)
    ) {
        let (env, client, _admin, _asset) = setup_test_env();
        let mut total_expected_shares = 0i128;
        let mut users = soroban_sdk::Vec::new(&env);

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
        
        client.deposit(&user, &amount);
        let shares = client.balance(&user);
        
        assert_eq!(client.total_shares(), shares);
        
        client.withdraw(&user, &shares);
        assert_eq!(client.balance(&user), 0);
        assert_eq!(client.total_shares(), 0);
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
