//! Admin-settable seller KYC flags.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod storage;
mod types;

use soroban_sdk::{contract, contractimpl, Address, Env};
use types::DataKey;

#[cfg(test)]
mod tests;

/// Stores whether each seller has passed KYC.
#[contract]
pub struct SellerKycFlag;

#[contractimpl]
impl SellerKycFlag {
    /// Fix the administrator at deployment. The administrator cannot change.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Set or clear the KYC flag for `seller`.
    ///
    /// Only the administrator configured at deployment may call this; the
    /// administrator must authorize the invocation. Setting a flag to the
    /// value it already has is a no-op success.
    pub fn set_verified(env: Env, seller: Address, verified: bool) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        storage::set_verified(&env, &seller, verified);
    }

    /// Return the stored KYC flag for `seller`.
    ///
    /// Sellers that have never been verified return `false`.
    pub fn is_verified(env: Env, seller: Address) -> bool {
        storage::is_verified(&env, &seller)
    }
}
