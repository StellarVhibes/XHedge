#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Map};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Prices,
}

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Prices, &Map::<Address, i128>::new(&env));
        Ok(())
    }

    pub fn set_price(env: Env, admin: Address, asset: Address, price: i128) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }

        let mut prices: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Prices)
            .unwrap_or(Map::new(&env));
        prices.set(asset, price);
        env.storage().instance().set(&DataKey::Prices, &prices);
        Ok(())
    }

    /// Return USD price scaled to 9 decimals for the given asset.
    pub fn price(env: Env, asset: Address) -> i128 {
        let prices: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Prices)
            .unwrap_or(Map::new(&env));
        prices.get(asset).unwrap_or(1_000_000_000)
    }
}

