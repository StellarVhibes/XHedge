index c3a1512..e9dc12d 100644
-- a/smartcontract/contracts/volatility_shield/src/lib.rs
++ b/smartcontract/contracts/volatility_shield/src/lib.rs
@@ -1,5 +1,14 @@
 #![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TotalAssets,
    TotalShares,
}

 
 #[contract]
 pub struct VolatilityShield;
@@ -7,15 +16,61 @@ pub struct VolatilityShield;
 #[contractimpl]
 impl VolatilityShield {
     // Initialize the vault
    pub fn init(env: Env, admin: Address) {
    pub fn init(_env: Env, _admin: Address) {

         // TODO: Store admin
     }
     
     // Deposit assets
    pub fn deposit(env: Env, from: Address, amount: i128) {
    pub fn deposit(_env: Env, _from: Address, _amount: i128) {

         from.require_auth();
         // TODO: Logic
     }

    /// Convert a number of shares to the equivalent amount of assets.
    /// Rounds down, favoring the vault.
    pub fn convert_to_assets(env: Env, shares: i128) -> i128 {
        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);

        if total_shares == 0 {
            return shares;
        }

        // Calculation: (shares * total_assets) / total_shares
        // Rounding down is implicit in integer division.
        shares
            .checked_mul(total_assets)
            .unwrap()
            .checked_div(total_shares)
            .unwrap()
    }

    // Helper functions for storage
    pub fn total_assets(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalAssets)
            .unwrap_or(0)
    }

    pub fn total_shares(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalShares)
            .unwrap_or(0)
    }

    // Internal helper to update total assets (for testing/deposit logic later)
    pub fn set_total_assets(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalAssets, &amount);
    }

    // Internal helper to update total shares (for testing/deposit logic later)
    pub fn set_total_shares(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalShares, &amount);
    }
 }
 
 mod test;
diff --git a/smartcontract/contracts/volatility_shield/src/test.rs b/smartcontract/contracts/volatility_shield/src/test.rs
diff --git a/smartcontract/contracts/volatility_shield/src/lib.rs b/smartcontract/contracts/volatility_shield/src/lib.rs
index e9dc12d..9047962 100644
-- a/smartcontract/contracts/volatility_shield/src/lib.rs
++ b/smartcontract/contracts/volatility_shield/src/lib.rs
@@ -24,10 +24,29 @@ impl VolatilityShield {
     // Deposit assets
     pub fn deposit(_env: Env, _from: Address, _amount: i128) {
 
        from.require_auth();
        // from.require_auth();
         // TODO: Logic
     }
 
    /// Convert a number of assets to the equivalent amount of shares.
    /// Rounds down, favoring the vault.
    pub fn convert_to_shares(env: Env, amount: i128) -> i128 {
        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);

        if total_shares == 0 || total_assets == 0 {
            return amount;
        }

        // Calculation: (amount * total_shares) / total_assets
        // Rounding down is implicit in integer division.
        amount
            .checked_mul(total_shares)
            .unwrap()
            .checked_div(total_assets)
            .unwrap()
    }

     /// Convert a number of shares to the equivalent amount of assets.
     /// Rounds down, favoring the vault.
     pub fn convert_to_assets(env: Env, shares: i128) -> i128 {
diff --git a/smartcontract/contracts/volatility_shield/src/test.rs b/smartcontract/contracts/volatility_shield/src/test.rs
diff --git a/smartcontract/contracts/volatility_shield/src/lib.rs b/smartcontract/contracts/volatility_shield/src/lib.rs
index ff8917a..fc748cf 100644
-- a/smartcontract/contracts/volatility_shield/src/lib.rs
++ b/smartcontract/contracts/volatility_shield/src/lib.rs
@@ -40,6 +40,9 @@ impl VolatilityShield {
     /// Convert a number of assets to the equivalent amount of shares.
     /// Rounds down, favoring the vault.
     pub fn convert_to_shares(env: Env, amount: i128) -> i128 {
        if amount < 0 {
            panic!("negative amount");
        }
         let total_shares = Self::total_shares(&env);
         let total_assets = Self::total_assets(&env);
 
@@ -59,6 +62,9 @@ impl VolatilityShield {
     /// Convert a number of shares to the equivalent amount of assets.
     /// Rounds down, favoring the vault.
     pub fn convert_to_assets(env: Env, shares: i128) -> i128 {
        if shares < 0 {
            panic!("negative amount");
        }
         let total_shares = Self::total_shares(&env);
         let total_assets = Self::total_assets(&env);
 
