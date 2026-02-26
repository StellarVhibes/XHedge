#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Events as EventsTrait;
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env, IntoVal, Map};

extern crate std;

fn create_token_contract<'a>(
    env: &Env,
    admin: &Address,
) -> (Address, StellarAssetClient<'a>, TokenClient<'a>) {
    let contract_id = env.register_stellar_asset_contract_v2(admin.clone());
    let stellar_asset_client = StellarAssetClient::new(env, &contract_id.address());
    let token_client = TokenClient::new(env, &contract_id.address());
    (contract_id.address(), stellar_asset_client, token_client)
}

#[test]
fn test_init_stores_roles() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    assert_eq!(client.read_admin(), admin);
    assert_eq!(client.get_oracle(), oracle);
    assert_eq!(client.get_asset(), asset);
    assert_eq!(client.treasury(), treasury);
    assert_eq!(client.fee_percentage(), 500u32);

    // SC-3: Assert initial vault state is zero
    assert_eq!(client.total_assets(), 0);
    assert_eq!(client.total_shares(), 0);
    assert_eq!(client.get_strategies().len(), 0);
}

#[test]
fn test_init_already_initialized() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    let result = client.try_init(&admin, &asset, &oracle, &treasury, &500u32);
    assert!(result.is_ok());

    let result = client.try_init(&admin, &asset, &oracle, &treasury, &500u32);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_convert_to_assets() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &asset, &oracle, &treasury, &0u32);

    // 1. Test 1:1 conversion when total_shares is 0
    assert_eq!(client.convert_to_assets(&100), 100);

    // 2. Test exact conversion
    client.set_total_assets(&100);
    client.set_total_shares(&100);
    assert_eq!(client.convert_to_assets(&50), 50);

    // 3. Test rounding down (favors vault)
    client.set_total_assets(&10);
    client.set_total_shares(&4);
    assert_eq!(client.convert_to_assets(&3), 7);

    // 4. Test larger values
    client.set_total_assets(&1000);
    client.set_total_shares(&300);
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
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &asset, &oracle, &treasury, &0u32);

    // 1. Initial Deposit (total_shares = 0)
    assert_eq!(client.convert_to_shares(&100), 100);

    // 2. Precision Loss (favors vault by rounding down)
    client.set_total_assets(&3);
    client.set_total_shares(&1);
    assert_eq!(client.convert_to_shares(&10), 3);

    // 3. Standard Proportional Minting
    client.set_total_assets(&1000);
    client.set_total_shares(&500);
    assert_eq!(client.convert_to_shares(&200), 100);

    // 4. Rounding Down with Large Values
    client.set_total_assets(&300);
    client.set_total_shares(&1000);
    assert_eq!(client.convert_to_shares(&100), 333);
}

#[test]
fn test_strategy_registry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let strategy = Address::generate(&env);

    client.init(&admin, &asset, &oracle, &treasury, &0u32);
    assert_eq!(client.read_admin(), admin);

    client.add_strategy(&strategy);
    let strategies = client.get_strategies();
    assert_eq!(strategies.len(), 1);
    assert_eq!(strategies.get(0).unwrap(), strategy);

    let strategy_2 = Address::generate(&env);
    client.add_strategy(&strategy_2);
    let strategies = client.get_strategies();
    assert_eq!(strategies.len(), 2);
    assert_eq!(strategies.get(1).unwrap(), strategy_2);
}

#[test]
#[should_panic(expected = "negative amount")]
fn test_convert_to_shares_negative() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    client.convert_to_shares(&-1);
}

#[test]
fn test_take_fees() {
    let env = Env::default();
    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    let deposit_amount = 1000;
    let remaining = client.take_fees(&deposit_amount);
    assert_eq!(remaining, 950);
}

#[test]
fn test_deposit_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    let user = Address::generate(&env);
    let deposit_amount = 1000;
    stellar_asset_client.mint(&user, &deposit_amount);

    client.deposit(&user, &deposit_amount);

    assert_eq!(client.balance(&user), 1000);
    assert_eq!(client.total_assets(), 1000);
    assert_eq!(client.total_shares(), 1000);
}

#[test]
fn test_withdraw_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.init(&admin, &token_id, &oracle, &treasury, &0u32);
    client.set_total_shares(&1000);
    client.set_total_assets(&5000);

    let user = Address::generate(&env);
    client.set_balance(&user, &100);

    stellar_asset_client.mint(&contract_id, &5000);

    client.withdraw(&user, &50);

    assert_eq!(client.balance(&user), 50);
    assert_eq!(client.total_shares(), 950);
    assert_eq!(client.total_assets(), 4750);
    assert_eq!(token_client.balance(&user), 250);
}

#[test]
fn test_rebalance_admin_auth_accepted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

<<<<<<< HEAD
    client.init(&admin, &asset, &oracle, &treasury, &0u32);
    env.ledger().set_timestamp(12345);
    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());
    client.rebalance(&50u32);
=======
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
    env.ledger().set_timestamp(12345);
    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());
    // Propose Rebalance with threshold 1 -> immediate execution
    client.propose_action(&admin, &ActionType::Rebalance);
>>>>>>> origin/main
}

#[test]
fn test_rebalance_oracle_auth_accepted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

<<<<<<< HEAD
    client.init(&admin, &asset, &oracle, &treasury, &0u32);
    env.ledger().set_timestamp(12345);
    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());
    client.rebalance(&50u32);
=======
    let guardians = soroban_sdk::vec![&env, admin.clone(), oracle.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
    env.ledger().set_timestamp(12345);
    let allocations: Map<Address, i128> = Map::new(&env);
    client.set_oracle_data(&allocations, &env.ledger().timestamp());
    
    // Propose Rebalance with threshold 1 -> immediate execution
    client.propose_action(&oracle, &ActionType::Rebalance);
    client.propose_action(&oracle, &ActionType::Rebalance);
}

#[test]
fn test_multisig_set_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone(), oracle.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &2u32);

    let id = client.propose_action(&admin, &ActionType::SetPaused(true));
    
    // One approval not enough
    assert!(!client.is_paused());
    
    // Second approval triggers execution
    client.approve_action(&oracle, &id);
    assert!(client.is_paused());
}

#[test]
fn test_multisig_add_strategy() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let strategy = Address::generate(&env);
    // threshold 1 -> immediate
    client.propose_action(&admin, &ActionType::AddStrategy(strategy.clone()));

    assert_eq!(client.get_strategies().get(0).unwrap(), strategy);
}

#[test]
fn test_multisig_unauthorized_propose() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &Address::generate(&env), &Address::generate(&env), &Address::generate(&env), &0, &guardians, &1);

    let stranger = Address::generate(&env);
    let result = client.try_propose_action(&stranger, &ActionType::Rebalance);
    assert!(result.is_err());
>>>>>>> origin/main
}

#[test]
fn test_guardian_crud() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];

    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);

    let guardian_2 = Address::generate(&env);
    client.add_guardian(&guardian_2);
    assert_eq!(client.get_guardians().len(), 2);
    assert!(client.get_guardians().contains(guardian_2.clone()));

    client.set_threshold(&2u32);
    assert_eq!(client.get_threshold(), 2);

    client.remove_guardian(&guardian_2);
    assert_eq!(client.get_guardians().len(), 1);
    assert!(!client.get_guardians().contains(guardian_2));

}



mod integration {
    use super::*;
    use soroban_sdk::IntoVal;

    // Simple client wrapper for mock strategy
    pub struct MockStrategyClient<'a> {
        env: &'a Env,
        address: Address,
    }

    impl<'a> MockStrategyClient<'a> {
        pub fn new(env: &'a Env, address: &Address) -> Self {
            Self {
                env,
                address: address.clone(),
            }
        }

        pub fn balance(&self) -> i128 {
            let result: i128 = self.env.invoke_contract::<i128>(
                &self.address,
                &soroban_sdk::Symbol::new(self.env, "balance"),
                soroban_sdk::vec![self.env],
            );
            result
        }

        pub fn deposit(&self, amount: i128) {
            self.env.invoke_contract::<()>(
                &self.address,
                &soroban_sdk::Symbol::new(self.env, "deposit"),
                soroban_sdk::vec![self.env, amount.into_val(self.env)],
            );
        }

        pub fn withdraw(&self, amount: i128) {
            self.env.invoke_contract::<()>(
                &self.address,
                &soroban_sdk::Symbol::new(self.env, "withdraw"),
                soroban_sdk::vec![self.env, amount.into_val(self.env)],
            );
        }

        pub fn simulate_price_drift(&self, new_balance: i128) {
            self.env.invoke_contract::<()>(
                &self.address,
                &soroban_sdk::Symbol::new(self.env, "simulate_price_drift"),
                soroban_sdk::vec![self.env, new_balance.into_val(self.env)],
            );
        }
    }

    fn create_mock_strategy(env: &Env) -> (Address, MockStrategyClient) {
        let mock_strategy_id = env.register_contract(None, mock_strategy::MockStrategy);
        let mock_client = MockStrategyClient::new(env, &mock_strategy_id);
        (mock_strategy_id, mock_client)
    }

    #[test]
    fn test_rebalance_deposit_into_mock_strategy() {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) =
            create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);

        client.init(&admin, &token_id, &oracle, &treasury, &0u32);

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        client.add_strategy(&mock_strategy_id);

        stellar_asset_client.mint(&contract_id, &1000);
        client.set_total_assets(&1000);
        client.set_total_shares(&1000);

        env.ledger().set_timestamp(12345);
        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id.clone(), 500);

        client.set_oracle_data(&allocations, &env.ledger().timestamp());
<<<<<<< HEAD
        client.rebalance(&50u32);
=======
        client.propose_action(&admin, &ActionType::Rebalance);
>>>>>>> origin/main

        assert_eq!(mock_client.balance(), 500);
        assert_eq!(token_client.balance(&contract_id), 500);
        assert_eq!(token_client.balance(&mock_strategy_id), 500);
    }

    #[test]
    fn test_rebalance_withdraw_from_mock_strategy() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) =
            create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);

        client.init(&admin, &token_id, &oracle, &treasury, &0u32);

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        client.add_strategy(&mock_strategy_id);

        stellar_asset_client.mint(&contract_id, &1000);
        client.set_total_assets(&1000);
        client.set_total_shares(&1000);

        env.ledger().set_timestamp(12345);
        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id.clone(), 500);
        client.set_oracle_data(&allocations, &env.ledger().timestamp());
<<<<<<< HEAD
        client.rebalance(&50u32);
=======
        client.propose_action(&admin, &ActionType::Rebalance);
>>>>>>> origin/main

        assert_eq!(mock_client.balance(), 500);

        env.ledger().set_timestamp(12346); // Increment for subsequent update
        let mut allocations2: Map<Address, i128> = Map::new(&env);
        allocations2.set(mock_strategy_id.clone(), 200);
        client.set_oracle_data(&allocations2, &env.ledger().timestamp());
<<<<<<< HEAD
        client.rebalance(&50u32);
=======
        client.propose_action(&admin, &ActionType::Rebalance);
>>>>>>> origin/main

        assert_eq!(mock_client.balance(), 200);
        assert_eq!(token_client.balance(&contract_id), 800);
        assert_eq!(token_client.balance(&mock_strategy_id), 200);
    }

    #[test]
    fn test_rebalance_with_multiple_strategies() {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let (token_id, stellar_asset_client, token_client) =
            create_token_contract(&env, &token_admin);

        let contract_id = env.register_contract(None, VolatilityShield);
        let client = VolatilityShieldClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let treasury = Address::generate(&env);

        client.init(&admin, &token_id, &oracle, &treasury, &0u32);

        let (mock_strategy_id1, mock_client1) = create_mock_strategy(&env);
        let (mock_strategy_id2, mock_client2) = create_mock_strategy(&env);

        client.add_strategy(&mock_strategy_id1);
        client.add_strategy(&mock_strategy_id2);

        stellar_asset_client.mint(&contract_id, &1000);
        client.set_total_assets(&1000);
        client.set_total_shares(&1000);

        env.ledger().set_timestamp(12345);
        let mut allocations: Map<Address, i128> = Map::new(&env);
        allocations.set(mock_strategy_id1.clone(), 300);
        allocations.set(mock_strategy_id2.clone(), 400);
        client.set_oracle_data(&allocations, &env.ledger().timestamp());
<<<<<<< HEAD
        client.rebalance(&50u32);
=======
        client.propose_action(&admin, &ActionType::Rebalance);
>>>>>>> origin/main

        assert_eq!(mock_client1.balance(), 300);
        assert_eq!(mock_client2.balance(), 400);
        assert_eq!(token_client.balance(&contract_id), 300);
        assert_eq!(token_client.balance(&mock_strategy_id1), 300);
        assert_eq!(token_client.balance(&mock_strategy_id2), 400);
    }

    #[test]
    fn test_mock_strategy_deposit_withdraw_flow() {
        let env = Env::default();

        let (mock_strategy_id, mock_client) = create_mock_strategy(&env);

        assert_eq!(mock_client.balance(), 0);

        mock_client.deposit(100);
        assert_eq!(mock_client.balance(), 100);

        mock_client.deposit(50);
        assert_eq!(mock_client.balance(), 150);

        mock_client.withdraw(75);
        assert_eq!(mock_client.balance(), 75);

        mock_client.withdraw(75);
        assert_eq!(mock_client.balance(), 0);
    }
}

// ── Pause Mechanism Tests ─────────────────────────

#[test]
fn test_set_paused_toggles_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    // Default: not paused
    assert!(!client.is_paused());

    // Pause
    client.set_paused(&true);
    assert!(client.is_paused());

    // Unpause
    client.set_paused(&false);
    assert!(!client.is_paused());
}

#[test]
#[should_panic(expected = "ContractPaused")]
fn test_deposit_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &500u32);

    // Pause the vault
    client.set_paused(&true);

    // Deposit should be blocked
    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &1000);
    client.deposit(&user, &500);
}

#[test]
#[should_panic(expected = "ContractPaused")]
fn test_withdraw_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    // Set up a balance for user
    client.set_total_shares(&100);
    client.set_total_assets(&100);
    let user = Address::generate(&env);
    client.set_balance(&user, &50);
    stellar_asset_client.mint(&contract_id, &100);

    // Pause the vault
    client.set_paused(&true);

    // Withdraw should be blocked
    client.withdraw(&user, &10);
}

#[test]
fn test_upgrade_and_migrate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &500u32, &guardians, &1u32);

    // Initial version should be 1
    assert_eq!(client.version(), 1);

    // Migrate to version 2
    client.migrate(&2);
    assert_eq!(client.version(), 2);
}

#[cfg(test)]
mod fuzz_tests {
    use super::*;
    use proptest::prelude::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    proptest! {
        #[test]
        fn fuzz_convert_to_shares(
            total_shares in 0i128..1_000_000_000_000_000_000,
            total_assets in 0i128..1_000_000_000_000_000_000,
            amount in 0i128..1_000_000_000_000_000_000,
        ) {
            let env = Env::default();
            let contract_id = env.register_contract(None, VolatilityShield);
            let client = VolatilityShieldClient::new(&env, &contract_id);

            let admin = Address::generate(&env);
            let asset = Address::generate(&env);
            let oracle = Address::generate(&env);
            let treasury = Address::generate(&env);
            client.init(&admin, &asset, &oracle, &treasury, &0u32);

            client.set_total_shares(&total_shares);
            client.set_total_assets(&total_assets);

            // Verify no unexpected panic on positive valid inputs up to large ranges.
            let _shares = client.convert_to_shares(&amount);
        }

        #[test]
        fn fuzz_convert_to_assets(
            total_shares in 0i128..1_000_000_000_000_000_000,
            total_assets in 0i128..1_000_000_000_000_000_000,
            shares in 0i128..1_000_000_000_000_000_000,
        ) {
            let env = Env::default();
            let contract_id = env.register_contract(None, VolatilityShield);
            let client = VolatilityShieldClient::new(&env, &contract_id);

            let admin = Address::generate(&env);
            let asset = Address::generate(&env);
            let oracle = Address::generate(&env);
            let treasury = Address::generate(&env);
            client.init(&admin, &asset, &oracle, &treasury, &0u32);

            client.set_total_shares(&total_shares);
            client.set_total_assets(&total_assets);

            // Verify no unexpected panic on positive valid inputs up to large ranges.
            let _assets = client.convert_to_assets(&shares);
        }
    }
}

#[test]
fn test_set_deposit_and_withdraw_caps() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &asset, &oracle, &treasury, &500u32);

    client.set_deposit_cap(&1000, &5000);
    client.set_withdraw_cap(&500);

    // Testing getter equivalent isn't exposed but auth flow succeeds
}

#[test]
#[should_panic(expected = "DepositCapExceeded: per-user deposit cap exceeded")]
fn test_deposit_fails_when_user_cap_exceeded() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    // Set MaxDepositPerUser to 500
    client.set_deposit_cap(&500, &5000);

    let user = Address::generate(&env);
    let deposit_amount = 600;
    stellar_asset_client.mint(&user, &deposit_amount);

    // This should panic
    client.deposit(&user, &deposit_amount);
}

#[test]
#[should_panic(expected = "DepositCapExceeded: global deposit cap exceeded")]
fn test_deposit_fails_when_global_cap_exceeded() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    // Set MaxTotalAssets to 1000, high user cap
    client.set_deposit_cap(&5000, &1000);

    let user = Address::generate(&env);
    stellar_asset_client.mint(&user, &1500);

    // This should panic
    client.deposit(&user, &1500);
}

#[test]
#[should_panic(expected = "WithdrawalCapExceeded: per-tx withdrawal cap exceeded")]
fn test_withdraw_fails_when_cap_exceeded() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, _) = create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);
    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    // Setup initial state
    client.set_total_shares(&1000);
    client.set_total_assets(&1000);
    let user = Address::generate(&env);
    client.set_balance(&user, &1000);
    stellar_asset_client.mint(&contract_id, &1000);

    // Set withdrawal cap to 200
    client.set_withdraw_cap(&200);

    // Trying to withdraw 300 should panic
    client.withdraw(&user, &300);
}

#[test]
<<<<<<< HEAD
=======
#[should_panic(expected = "StaleOracleData")]
>>>>>>> origin/main
fn test_rebalance_stale_oracle_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

<<<<<<< HEAD
    client.init(&admin, &asset, &oracle, &treasury, &0u32);
=======
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
>>>>>>> origin/main

    // Set max staleness to 100s
    client.set_max_staleness(&100);

    let allocations: Map<Address, i128> = Map::new(&env);
    let timestamp = 1000;
    env.ledger().set_timestamp(timestamp);
    client.set_oracle_data(&allocations, &timestamp);

    // Advance time to 1101s (timestamp + 100 + 1)
    env.ledger().set_timestamp(timestamp + 100 + 1);

<<<<<<< HEAD
    let result = client.try_rebalance(&50u32);
    assert_eq!(result, Err(Ok(Error::StaleOracleData)));
=======
    // Propose Rebalance with threshold 1 -> triggers immediate execution via unwrap() -> panics with StaleOracleData
    client.propose_action(&admin, &ActionType::Rebalance);
>>>>>>> origin/main
}

#[test]
fn test_set_oracle_data_invalid_timestamp() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

<<<<<<< HEAD
    client.init(&admin, &asset, &oracle, &treasury, &0u32);

=======
    let guardians = soroban_sdk::vec![&env, admin.clone()];
    client.init(&admin, &asset, &oracle, &treasury, &0u32, &guardians, &1u32);
>>>>>>> origin/main
    let allocations: Map<Address, i128> = Map::new(&env);
    let now = 1000;
    env.ledger().set_timestamp(now);

    // Future timestamp
    let result = client.try_set_oracle_data(&allocations, &(now + 1));
    assert_eq!(result, Err(Ok(Error::InvalidTimestamp)));

    // Equal to past
    client.set_oracle_data(&allocations, &now);
    let result = client.try_set_oracle_data(&allocations, &now);
    assert_eq!(result, Err(Ok(Error::InvalidTimestamp)));
}
<<<<<<< HEAD

// ── Slippage Protection Tests ─────────────────────────

/*
#[test]
fn test_rebalance_slippage_protection_basic() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let (token_id, stellar_asset_client, token_client) =
        create_token_contract(&env, &token_admin);

    let contract_id = env.register_contract(None, VolatilityShield);
    let client = VolatilityShieldClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.init(&admin, &token_id, &oracle, &treasury, &0u32);

    let (mock_strategy_id, mock_client) = create_mock_strategy(&env);
    client.add_strategy(&mock_strategy_id);

    stellar_asset_client.mint(&contract_id, &1000);
    client.set_total_assets(&1000);
    client.set_total_shares(&1000);

    env.ledger().set_timestamp(12345);
    let mut allocations: Map<Address, i128> = Map::new(&env);
    allocations.set(mock_strategy_id.clone(), 500);

    client.set_oracle_data(&allocations, &env.ledger().timestamp());

    // Rebalance with high tolerance - should succeed
    client.rebalance(&1000u32); // 10% tolerance
    let balance: i128 = mock_client.balance();
    assert_eq!(balance, 500i128);

    // Reset for next test
    mock_client.withdraw(500);
    stellar_asset_client.mint(&contract_id, &500);

    // Set up again but simulate slippage by directly modifying strategy balance
    client.set_oracle_data(&allocations, &env.ledger().timestamp());
    mock_client.simulate_price_drift(600i128); // Simulate 20% price increase

    // Rebalance with low tolerance - should fail due to slippage
    let result = client.try_rebalance(&100u32); // 1% tolerance
    assert_eq!(result, Err(Ok(Error::SlippageExceeded)));
}
*/
=======
>>>>>>> origin/main
