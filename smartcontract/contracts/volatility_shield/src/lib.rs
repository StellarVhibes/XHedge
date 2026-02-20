#![no_std]
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

#[contractimpl]
impl VolatilityShield {
    // Initialize the vault
    pub fn init(_env: Env, _admin: Address) {

        // TODO: Store admin
    }
    
    // Deposit assets
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
