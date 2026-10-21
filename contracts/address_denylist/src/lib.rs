//! Address denylist.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod list;
mod types;

pub use types::{DenyError, Role};

use soroban_sdk::{contract, contractimpl, Address, Env};

#[cfg(test)]
mod tests;

/// Admin-managed list of addresses blocked as issuer and as payer.
#[contract]
pub struct AddressDenylist;

#[contractimpl]
impl AddressDenylist {
    /// Stores the only address allowed to change the list.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&types::DataKey::Admin, &admin);
    }

    /// Adds `who` to the denylist. The stored admin must authorize the call.
    pub fn deny(env: Env, admin: Address, who: Address) {
        list::deny(&env, &admin, &who);
    }

    /// Removes `who` from the denylist. Missing entries are left unchanged.
    pub fn allow(env: Env, admin: Address, who: Address) {
        list::allow(&env, &admin, &who);
    }

    /// Returns true when `who` is currently denied.
    pub fn is_denied(env: Env, who: Address) -> bool {
        list::is_denied(&env, &who)
    }

    /// Returns false when `who` is denied, for both issuer and payer roles.
    pub fn role_allowed(env: Env, who: Address, role: Role) -> bool {
        match role {
            Role::Issuer | Role::Payer => !list::is_denied(&env, &who),
        }
    }
}
