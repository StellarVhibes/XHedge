#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env};

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
    Token,
    Balance(Address),
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
    pub fn deposit(env: Env, from: Address, amount: i128) {
        if amount <= 0 {
            panic!("deposit amount must be positive");
        }
        from.require_auth();

        // Transfer backing token
        let token: Address = env.storage().instance().get(&DataKey::Token).expect("Token not initialized");
        soroban_sdk::token::Client::new(&env, &token).transfer(&from, &env.current_contract_address(), &amount);

        // Determine proportional shares 
        let shares_to_mint = Self::convert_to_shares(env.clone(), amount);
        
        // Update user balances
        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        env.storage().persistent().set(&balance_key, &(current_balance.checked_add(shares_to_mint).unwrap()));

        // Update overall Vault states
        let total_shares = Self::total_shares(&env);
        let total_assets = Self::total_assets(&env);
        Self::set_total_shares(env.clone(), total_shares.checked_add(shares_to_mint).unwrap());
        Self::set_total_assets(env.clone(), total_assets.checked_add(amount).unwrap());

        // Tracking hook
        env.events().publish((symbol_short!("Deposit"), from.clone()), amount);
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

    // Internal helper to update total assets (for testing/deposit logic later)
    pub fn set_total_assets(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalAssets, &amount);
    }

    // Internal helper to update total shares (for testing/deposit logic later)
    pub fn set_total_shares(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalShares, &amount);
    }

    // Helper functions for updating specific tests mapping overrides
    pub fn set_balance(env: Env, user: Address, amount: i128) {
        env.storage().persistent().set(&DataKey::Balance(user), &amount);
    }
    
    pub fn balance(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(user)).unwrap_or(0)
    }

    pub fn set_token(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }
}

mod test;
