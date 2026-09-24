//! `init_once` is a minimal Soroban contract that records an administrator
//! during deployment and prevents the initializer from being called again.
//!
//! The `__constructor(admin)` function stores the supplied admin address and
//! an initialization marker in instance storage. The read-only `admin()` and
//! `is_initialized()` functions expose those values. A second constructor
//! call panics with `already initialized`; there is no public method to change
//! the administrator after deployment.

#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};

const INITIALIZED: Symbol = symbol_short!("INIT");
const ADMIN: Symbol = symbol_short!("ADMIN");

#[contract]
pub struct InitOnce;

#[contractimpl]
impl InitOnce {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&INITIALIZED) {
            panic!("already initialized");
        }
        env.storage().instance().set(&INITIALIZED, &true);
        env.storage().instance().set(&ADMIN, &admin);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap()
    }

    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&INITIALIZED)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_first_init_succeeds() {
        let env = Env::default();
        let contract_id = env.register_contract(None, InitOnce);
        let client = InitOnceClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.__constructor(&admin);

        assert!(client.is_initialized());
        assert_eq!(client.admin(), admin);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_init_fails() {
        let env = Env::default();
        let contract_id = env.register_contract(None, InitOnce);
        let client = InitOnceClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.__constructor(&admin);
        client.__constructor(&admin);
    }
}
