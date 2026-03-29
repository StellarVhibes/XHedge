#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env};

#[contracttype]
pub enum DataKey {
    Balance,
}

#[contract]
pub struct MockStrategy;

#[contractimpl]
impl MockStrategy {
    /// Get the current balance of the strategy.
    pub fn balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    /// Deposit funds into the strategy.
    pub fn deposit(env: Env, amount: i128) {
        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance, &(current + amount));
    }

    /// Withdraw funds from the strategy.
    pub fn withdraw(env: Env, amount: i128) {
        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance, &(current - amount));
    }

    /// Simulate price drift by directly modifying the balance
    /// This represents external factors affecting the strategy's value
    pub fn simulate_price_drift(env: Env, new_balance: i128) {
        env.storage()
            .instance()
            .set(&DataKey::Balance, &new_balance);
    }
}
