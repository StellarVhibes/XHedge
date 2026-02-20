#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient;

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (Address, StellarAssetClient<'a>, TokenClient<'a>) {
    let contract_id = env.register_stellar_asset_contract_v2(admin.clone());
    let stellar_asset_client = StellarAssetClient::new(env, &contract_id.address());
    let token_client = TokenClient::new(env, &contract_id.address());
    (contract_id.address(), stellar_asset_client, token_client)
}

#[test]
fn test_convert_to_assets() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    // 1. Test 1:1 conversion when total_shares is 0
    assert_eq!(client.convert_to_assets(&100), 100);

    // 2. Test exact conversion
    // Setup: total_assets = 100, total_shares = 100
    client.set_total_assets(&100);
    client.set_total_shares(&100);
    assert_eq!(client.convert_to_assets(&50), 50);

    // 3. Test rounding down (favors vault)
    // Setup: total_assets = 10, total_shares = 4
    // Shares = 3 -> (3 * 10) / 4 = 30 / 4 = 7.5 -> 7
    client.set_total_assets(&10);
    client.set_total_shares(&4);
    assert_eq!(client.convert_to_assets(&3), 7);

    // 4. Test larger values
    // Setup: total_assets = 1000, total_shares = 300
    // Shares = 100 -> (100 * 1000) / 300 = 100000 / 300 = 333.33 -> 333
    client.set_total_assets(&1000);
    client.set_total_shares(&300);
    assert_eq!(client.convert_to_assets(&100), 333);
}

#[test]
fn test_convert_to_shares() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    // 1. Initial Deposit (total_shares = 0)
    // Should be 1:1
    assert_eq!(client.convert_to_shares(&100), 100);

    // 2. Precision Loss (favors vault by rounding down)
    // Setup: total_assets = 3, total_shares = 1
    // Amount = 10 -> (10 * 1) / 3 = 3.33 -> 3
    client.set_total_assets(&3);
    client.set_total_shares(&1);
    assert_eq!(client.convert_to_shares(&10), 3);

    // 3. Standard Proportional Minting
    // Setup: total_assets = 1000, total_shares = 500
    // Amount = 200 -> (200 * 500) / 1000 = 100
    client.set_total_assets(&1000);
    client.set_total_shares(&500);
    assert_eq!(client.convert_to_shares(&200), 100);

    // 4. Rounding Down with Large Values
    // Setup: total_assets = 300, total_shares = 1000
    // Amount = 100 -> (100 * 1000) / 300 = 333.33 -> 333
    client.set_total_assets(&300);
    client.set_total_shares(&1000);
    assert_eq!(client.convert_to_shares(&100), 333);
}

#[test]
fn test_deposit_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth(); 
    
    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);
    
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    
    client.set_token(&token_id);
    stellar_asset_client.mint(&user, &5000); // 5000 test tokens minted to wallet

    // 1st Deposit
    client.deposit(&user, &1000);

    // Initial 1:1 conversion evaluation: amount = shares minted
    assert_eq!(client.balance(&user), 1000);
    assert_eq!(client.total_assets(), 1000);
    assert_eq!(client.total_shares(), 1000);
    assert_eq!(token_client.balance(&contract_id), 1000);
    assert_eq!(token_client.balance(&user), 4000);

    // 2nd Fractional Deposit 
    // Manual manipulation forcing fractional yields evaluating precision conversion logic natively
    client.set_total_assets(&2500); // Manually inject artificial backing yield (1.0 -> 2.5 returns)
    
    // Deposit an additional 500 tokens
    client.deposit(&user, &500);

    // Assert post-deposit logic processing shares formulas
    // Convert 500 amount into shares evaluating logic: 500 * (1000 Total Shares / 2500 Total Assets) = 200 Shares
    assert_eq!(client.balance(&user), 1200); // 1000 originally + 200 fractional scaling yield
    assert_eq!(client.total_shares(), 1200);
    assert_eq!(client.total_assets(), 3000); // 2500 + 500 added
    assert_eq!(token_client.balance(&contract_id), 1500); // (1000 previously deposited natively + 500 currently injected via token pipeline wrapper transfer mechanics)
}

#[test]
#[should_panic(expected = "deposit amount must be positive")]
fn test_deposit_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    
    client.deposit(&user, &0);
}

#[test]
#[should_panic]
fn test_deposit_unauthorized() {
    let env = Env::default();
    
    let token_admin = Address::generate(&env);
    let (token_id, _stellar_asset_client, _token_client) = create_token_contract(&env, &token_admin);
    
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    
    let user = Address::generate(&env);
    
    client.set_token(&token_id);
    
    // Attempt deposit natively without auth bindings wrapped via mock
    client.deposit(&user, &100);
}
