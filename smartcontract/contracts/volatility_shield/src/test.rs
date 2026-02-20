index 0624e47..4fe9c6b 100644
-- a/smartcontract/contracts/volatility_shield/src/test.rs
++ b/smartcontract/contracts/volatility_shield/src/test.rs
@@ -1,12 +1,33 @@
 #![cfg(test)]
 use super::*;
use soroban_sdk::Env;
use soroban_sdk::{testutils::Address as _, Address, Env};
 
 #[test]
fn test_init() {
    // let env = Env::default();
    // let contract_id = env.register_contract(None, VolatilityShield);
    // let client = VolatilityShieldClient::new(&env, &contract_id);
fn test_convert_to_assets() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
 
    // TODO: Test initialization
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

From 19d94f8714692c7a3ba7337735d566306b7eb2d1 Mon Sep 17 00:00:00 2001
From: Akpolo Ogagaoghene Prince <ogazboizakpolo@gmail.com>
Date: Fri, 20 Feb 2026 01:27:38 +0100
Subject: [PATCH 2/3] feat: implement ERC-4626 share conversion logic for
 deposits [SC-5]

--
 .../contracts/volatility_shield/src/lib.rs    | 21 +++++++++++-
 .../contracts/volatility_shield/src/test.rs   | 32 +++++++++++++++++++
 2 files changed, 52 insertions(+), 1 deletion(-)

diff --git a/smartcontract/contracts/volatility_shield/src/lib.rs b/smartcontract/contracts/volatility_shield/src/lib.rs
diff --git a/smartcontract/contracts/volatility_shield/src/test.rs b/smartcontract/contracts/volatility_shield/src/test.rs
index 4fe9c6b..35e2cd9 100644
-- a/smartcontract/contracts/volatility_shield/src/test.rs
++ b/smartcontract/contracts/volatility_shield/src/test.rs
@@ -31,3 +31,35 @@ fn test_convert_to_assets() {
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

From ffc7adcd88cb4f42e8e2d91cfa98f4b634ababc2 Mon Sep 17 00:00:00 2001
From: Akpolo Ogagaoghene Prince <ogazboizakpolo@gmail.com>
Date: Fri, 20 Feb 2026 02:33:25 +0100
Subject: [PATCH 3/3] feat: add negative amount validation to share
 calculations [SC-5]

--
 .../contracts/volatility_shield/src/lib.rs     |  6 ++++++
 .../contracts/volatility_shield/src/test.rs    | 18 ++++++++++++++++++
 2 files changed, 24 insertions(+)

diff --git a/smartcontract/contracts/volatility_shield/src/lib.rs b/smartcontract/contracts/volatility_shield/src/lib.rs
diff --git a/smartcontract/contracts/volatility_shield/src/test.rs b/smartcontract/contracts/volatility_shield/src/test.rs
index 35e2cd9..2dd41dd 100644
-- a/smartcontract/contracts/volatility_shield/src/test.rs
++ b/smartcontract/contracts/volatility_shield/src/test.rs
@@ -32,6 +32,15 @@ fn test_convert_to_assets() {
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
@@ -63,3 +72,12 @@ fn test_convert_to_shares() {
     client.set_total_shares(&1000);
     assert_eq!(client.convert_to_shares(&100), 333);
 }

#[test]
#[should_panic(expected = "negative amount")]
fn test_convert_to_shares_negative() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    client.convert_to_shares(&-1);
