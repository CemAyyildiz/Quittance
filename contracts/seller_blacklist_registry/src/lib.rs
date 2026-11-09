//! `seller-blacklist-registry` — standalone Soroban contract: admin seller
//! blacklist.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::types::{BlacklistError, DataKey};

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Admin-managed seller blacklist registry contract.
#[contract]
pub struct SellerBlacklistRegistry;

#[contractimpl]
impl SellerBlacklistRegistry {
    /// Optionally bind a single administrator address to this instance.
    ///
    /// Once initialized, [`SellerBlacklistRegistry::blacklist`] and
    /// [`SellerBlacklistRegistry::unblacklist`] require `admin.require_auth()`.
    pub fn init_admin(env: Env, admin: Address) -> Result<(), BlacklistError> {
        logic::init_admin_once(&env, &admin)
    }

    /// Return the configured administrator address, if any.
    pub fn admin(env: Env) -> Option<Address> {
        storage::get_admin(&env)
    }

    /// Add `seller` to the blacklist so `is_allowed(seller)` returns `false`.
    ///
    /// Blacklisting an already-blacklisted seller is an idempotent no-op.
    pub fn blacklist(env: Env, seller: Address) {
        logic::require_admin_if_configured(&env);
        storage::set_blacklisted(&env, &seller, true);
    }

    /// Remove `seller` from the blacklist so `is_allowed(seller)` returns `true`.
    ///
    /// Unblacklisting a seller that is not on the blacklist is a safe no-op.
    pub fn unblacklist(env: Env, seller: Address) {
        logic::require_admin_if_configured(&env);
        storage::set_blacklisted(&env, &seller, false);
    }

    /// Return `true` when `seller` is allowed to create new invoices (i.e. not
    /// on the blacklist).
    pub fn is_allowed(env: Env, seller: Address) -> bool {
        !storage::is_blacklisted(&env, &seller)
    }

    /// Return `true` when `seller` is currently on the blacklist.
    pub fn is_blacklisted(env: Env, seller: Address) -> bool {
        storage::is_blacklisted(&env, &seller)
    }
}
