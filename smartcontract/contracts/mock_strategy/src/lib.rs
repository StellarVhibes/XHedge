#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
pub enum DataKey {
    Balance,
    /// The vault address that receives funds on withdraw.
    Vault,
    /// The underlying token used for real-token tests.
    Token,
}

#[contract]
pub struct MockStrategy;

#[contractimpl]
impl MockStrategy {
    /// Initialise with the vault and token addresses for real-token transfer support.
    /// Optional: only needed when tests require actual token movements.
    pub fn init(env: Env, vault: Address, token: Address) {
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Token, &token);
    }

    /// Get the current balance of the strategy.
    pub fn balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    /// Collect currently accumulated yield and transfer it to the vault.
    /// Returns the amount transferred.
    pub fn collect_yield(env: Env) -> i128 {
        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        if current <= 0 {
            return 0;
        }

        let vault: Option<Address> = env.storage().instance().get(&DataKey::Vault);
        let token_addr: Option<Address> = env.storage().instance().get(&DataKey::Token);
        if let (Some(vault_addr), Some(tok)) = (vault, token_addr) {
            let token_client = token::Client::new(&env, &tok);
            token_client.transfer(&env.current_contract_address(), &vault_addr, &current);
        }

        env.storage().instance().set(&DataKey::Balance, &0i128);
        current
    }

    /// Deposit funds into the strategy.
    pub fn deposit(env: Env, amount: i128) {
        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance, &(current + amount));
    }

    /// Withdraw funds from the strategy.
    /// If a vault and token are configured, transfers tokens back to the vault.
    pub fn withdraw(env: Env, amount: i128) {
        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance, &(current - amount));

        // If real-token mode is configured, transfer tokens back to vault.
        let vault: Option<Address> = env.storage().instance().get(&DataKey::Vault);
        let token_addr: Option<Address> = env.storage().instance().get(&DataKey::Token);
        if let (Some(vault_addr), Some(tok)) = (vault, token_addr) {
            let token_client = token::Client::new(&env, &tok);
            token_client.transfer(&env.current_contract_address(), &vault_addr, &amount);
        }
    }

    /// Simulate price drift by directly modifying the balance.
    pub fn simulate_price_drift(env: Env, new_balance: i128) {
        env.storage()
            .instance()
            .set(&DataKey::Balance, &new_balance);
    }
}
