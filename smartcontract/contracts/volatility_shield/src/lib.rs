#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NegativeAmount = 3,
    Unauthorized = 4,
    NoStrategies = 5,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TotalAssets,
    TotalShares,
    Strategies,
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

    // Internal helper to update total assets (for testing/deposit logic later)
    pub fn set_total_assets(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalAssets, &amount);
    }

    // Internal helper to update total shares (for testing/deposit logic later)
    pub fn set_total_shares(env: Env, amount: i128) {
        env.storage().instance().set(&DataKey::TotalShares, &amount);
    }

    /// Add a strategy to the registry. Admin only.
    pub fn add_strategy(env: Env, strategy: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut strategies: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Strategies)
            .unwrap_or(Vec::new(&env));

        strategies.push_back(strategy);
        env.storage()
            .instance()
            .set(&DataKey::Strategies, &strategies);
        Ok(())
    }

    /// Harvest yield from all registered strategies.
    ///
    /// Calls `harvest()` on each strategy contract, which returns the yield
    /// amount collected. The total yield is added to the vault's `total_assets`
    /// without minting new shares, effectively increasing the share price for
    /// all existing holders.
    ///
    /// Returns the total yield harvested.
    pub fn harvest(env: Env) -> Result<i128, Error> {
        // 1. Require admin authorization
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        // 2. Load registered strategies
        let strategies: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Strategies)
            .unwrap_or(Vec::new(&env));

        if strategies.is_empty() {
            return Err(Error::NoStrategies);
        }

        // 3. Call harvest() on each strategy and accumulate yield
        let mut total_yield: i128 = 0;
        for strategy in strategies.iter() {
            let yield_amount: i128 =
                env.invoke_contract(&strategy, &symbol_short!("harvest"), Vec::new(&env));
            total_yield = total_yield.checked_add(yield_amount).unwrap();
        }

        // 4. Increase total_assets by yield (no new shares minted)
        //    This increases the share price for all existing holders.
        if total_yield > 0 {
            let current_assets = Self::total_assets(&env);
            let new_total = current_assets.checked_add(total_yield).unwrap();
            env.storage()
                .instance()
                .set(&DataKey::TotalAssets, &new_total);
        }

        env.events()
            .publish((symbol_short!("harvest"),), total_yield);

        Ok(total_yield)
    }
}

mod test;
