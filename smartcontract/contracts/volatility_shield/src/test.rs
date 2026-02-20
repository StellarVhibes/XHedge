#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

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
