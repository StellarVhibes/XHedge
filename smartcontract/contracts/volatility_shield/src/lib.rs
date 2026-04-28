    pub fn set_fee_pct(env: Env, fee_percentage: u32) -> Result<(), Error> {
        let admin = Self::read_admin(&env);
        admin.require_auth();

        if fee_percentage > 10000 {
            return Err(Error::InvalidFeePercentage);
        }

        env.storage()
            .instance()
            .set(&DataKey::FeePercentage, &fee_percentage);
        
        env.events().publish(
            (symbol_short!("fee_pct"), symbol_short!("updated")),
            fee_percentage,
        );

        Ok(())
    }

    /// Set the deposit cap for a specific strategy.
    /// Only the admin can call this.
    pub fn set_strategy_cap(env: Env, strategy: Address, cap: i128) {
        Self::require_admin(&env);
        
        // Verify strategy exists
        let strategies = Self::get_strategies(&env);
        if !strategies.contains(strategy.clone()) {
            panic!("Strategy not registered");
        }
        
        if cap < 0 {
            panic!("cap must be non-negative");
        }
        
        env.storage()
            .instance()
            .set(&DataKey::StrategyDepositCap(strategy), &cap);
        
        env.events().publish(
            (symbol_short!("StrategyCap"),),
            (strategy, cap),
        );
    }