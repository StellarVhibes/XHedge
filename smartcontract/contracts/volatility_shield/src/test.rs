#![cfg(test)]
use super::*;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env};

#[test]
fn test_convert_to_assets() {
    let env = Env::default();
    let contract_id = env.register(VolatilityShield, ());
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
    let contract_id = env.register(VolatilityShield, ());
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

// ---- Mock Strategy Contract ----

#[contract]
pub struct MockStrategy;

#[contractimpl]
impl MockStrategy {
    pub fn harvest(_env: Env) -> i128 {
        50 // Returns 50 units of yield
    }
}

// ---- Harvest Tests ----

fn setup_vault_with_admin(env: &Env) -> (Address, VolatilityShieldClient<'_>) {
    let contract_id = env.register(VolatilityShield, ());
    let client = VolatilityShieldClient::new(env, &contract_id);
    let admin = Address::generate(env);

    // Store admin directly
    env.as_contract(&contract_id, || {
        env.storage().instance().set(&DataKey::Admin, &admin);
    });

    (admin, client)
}

#[test]
fn test_harvest_collects_yield_and_increases_share_price() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_vault_with_admin(&env);

    // Register a mock strategy
    let strategy_id = env.register(MockStrategy, ());
    client.add_strategy(&strategy_id);

    // Set initial vault state: 1000 assets, 1000 shares -> share price = 1.0
    client.set_total_assets(&1000);
    client.set_total_shares(&1000);

    // Harvest: mock strategy returns 50 yield
    let yield_amount = client.harvest();
    assert_eq!(yield_amount, 50);

    // Total assets increased, shares unchanged -> share price increased
    assert_eq!(client.total_assets(), 1050);
    assert_eq!(client.total_shares(), 1000);

    // Share price effectively: 1050/1000 = 1.05
    // Verify via convert_to_assets: 1000 shares -> 1050 assets
    assert_eq!(client.convert_to_assets(&1000), 1050);
}

#[test]
fn test_harvest_multiple_strategies() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_vault_with_admin(&env);

    // Register two mock strategies
    let strat1 = env.register(MockStrategy, ());
    let strat2 = env.register(MockStrategy, ());
    client.add_strategy(&strat1);
    client.add_strategy(&strat2);

    client.set_total_assets(&1000);
    client.set_total_shares(&1000);

    // Harvest from two strategies: 50 + 50 = 100
    let yield_amount = client.harvest();
    assert_eq!(yield_amount, 100);
    assert_eq!(client.total_assets(), 1100);
    assert_eq!(client.total_shares(), 1000);
}

#[test]
fn test_harvest_no_strategies_returns_error() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_vault_with_admin(&env);

    client.set_total_assets(&1000);
    client.set_total_shares(&1000);

    // Should fail with NoStrategies
    let result = client.try_harvest();
    assert!(result.is_err());
}

#[test]
fn test_harvest_no_admin_returns_error() {
    let env = Env::default();
    // No admin stored -> NotInitialized
    let contract_id = env.register(VolatilityShield, ());
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let result = client.try_harvest();
    assert!(result.is_err());
}