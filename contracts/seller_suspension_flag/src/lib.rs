#![no_std]

//! Admin-controlled seller suspension flag.

mod admin;
mod storage;
mod types;

pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct SellerSuspensionFlag;

#[contractimpl]
impl SellerSuspensionFlag {
    /// Create an instance controlled by `admin`.
    pub fn __constructor(env: Env, admin: Address) {
        storage::set_admin(&env, &admin);
    }

    /// Suspend `seller`. The configured administrator must authorize.
    pub fn suspend(env: Env, seller: Address) {
        admin::require(&env);
        storage::set_suspended(&env, &seller, true);
    }

    /// Reinstate `seller`. The configured administrator must authorize.
    pub fn reinstate(env: Env, seller: Address) {
        admin::require(&env);
        storage::set_suspended(&env, &seller, false);
    }

    /// Return whether `seller` is currently suspended.
    pub fn is_suspended(env: Env, seller: Address) -> bool {
        storage::is_suspended(&env, &seller)
    }

    /// Invoice-style convenience predicate; inverse of `is_suspended`.
    pub fn is_allowed(env: Env, seller: Address) -> bool {
        !storage::is_suspended(&env, &seller)
    }

    /// Return the configured administrator.
    pub fn admin(env: Env) -> Address {
        storage::admin(&env)
    }
}
