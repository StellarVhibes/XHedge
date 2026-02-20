#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NegativeAmount = 3,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TotalAssets,
    TotalShares,
    Treasury,
    FeePercentage,
}

#[contract]
pub struct VolatilityShield;

#[contractimpl]
impl VolatilityShield {
    // Initialize the vault
    pub fn init(env: Env, admin: Address, treasury: Address, fee_percentage: u32) {
        admin.require_auth();
        // Store admin
        env.storage().instance().set(&DataKey::Admin, &admin);
        // Store treasury
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        // Store fee percentage (in basis points, e.g. 500 = 5%)
        env.storage().instance().set(&DataKey::FeePercentage, &fee_percentage);
    }
    
    // Deposit assets
    pub fn deposit(_env: Env, _from: Address, _amount: i128) {

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

    pub fn treasury(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Treasury)
            .unwrap()
    }

    pub fn fee_percentage(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::FeePercentage)
            .unwrap_or(0)
    }

    // internal function to take fees
    pub fn take_fees(env: &Env, amount: i128) -> i128 {
        let fee_pct = Self::fee_percentage(&env);
        if fee_pct == 0 {
            return amount;
        }

        // Calculate fee based on basis points (out of 10000)
        let fee = amount
            .checked_mul(fee_pct as i128)
            .unwrap()
            .checked_div(10000)
            .unwrap();

        if fee > 0 {
            let treasury = Self::treasury(&env);
            // In a real implementation, you would transfer the fee token to the treasury using a token client.
            // For example:
            // let token = token::Client::new(env, &asset_address);
            // token.transfer(&env.current_contract_address(), &treasury, &fee);
            
            // For now, we simulate the fee deduction by returning the remaining amount.
        }

        amount - fee
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
