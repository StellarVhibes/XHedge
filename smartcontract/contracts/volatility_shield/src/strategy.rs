use soroban_sdk::{contractclient, Env};

#[contractclient(name = "StrategyTraitClient")]
pub trait StrategyTrait {
    /// Deposit assets into the strategy
    fn deposit(env: Env, amount: i128);

    /// Withdraw assets from the strategy
    fn withdraw(env: Env, amount: i128);

    /// Get the current balance of the strategy
    fn balance(env: Env) -> i128;
}
