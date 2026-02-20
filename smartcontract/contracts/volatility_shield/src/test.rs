#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_convert_to_assets() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &treasury, &0u32);

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
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &treasury, &0u32);

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
fn test_take_fees() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    
    // Initialize with 5% fee (500 basis points)
    client.init(&admin, &treasury, &500u32);

    // Test exact amount
    let deposit_amount = 1000;
    // Fee should be 5% of 1000 = 50
    // Remaining should be 950
    let remaining = client.take_fees(&deposit_amount);
    
    assert_eq!(remaining, 950);

    // Test zero fee situation
    let env2 = Env::default();
    let contract_id2 = env2.register_contract(None, VolatilityShield);
    let client2 = VolatilityShieldClient::new(&env2, &contract_id2);
    let admin2 = Address::generate(&env2);
    let treasury2 = Address::generate(&env2);
    
    // Initialize with 0% fee
    client2.init(&admin2, &treasury2, &0u32);
    let remaining2 = client2.take_fees(&deposit_amount);
    assert_eq!(remaining2, 1000);
}
