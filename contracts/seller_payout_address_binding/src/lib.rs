//! `seller-payout-address-binding` — standalone Soroban contract: seller
//! payout address binding with cooldown.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::verify_rebind_allowed;
pub use crate::types::{DataKey, Error, PayoutBinding, DEFAULT_REBIND_COOLDOWN_LEDGERS};

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Binds each seller to a payout destination address with a rebind cooldown.
#[contract]
pub struct SellerPayoutAddressBinding;

#[contractimpl]
impl SellerPayoutAddressBinding {
    /// Bind `seller` to `payout_address` at `ledger`.
    ///
    /// - Requires `seller` authorization.
    /// - The initial bind for a `seller` always succeeds immediately.
    /// - Subsequent rebinds require `ledger >= last_bound_at + cooldown`.
    pub fn bind(
        env: Env,
        seller: Address,
        payout_address: Address,
        ledger: u32,
    ) -> Result<(), Error> {
        seller.require_auth();
        let cooldown = storage::get_cooldown(&env);
        if let Some(existing) = storage::get_binding(&env, &seller) {
            logic::verify_rebind_allowed(existing.bound_at_ledger, ledger, cooldown)?;
        }
        storage::set_binding(
            &env,
            &seller,
            &PayoutBinding {
                payout_address,
                bound_at_ledger: ledger,
            },
        );
        Ok(())
    }

    /// Return the currently bound payout address for `seller`, or `None` if
    /// `seller` has never bound one.
    pub fn payout_address_of(env: Env, seller: Address) -> Option<Address> {
        storage::get_binding(&env, &seller).map(|b| b.payout_address)
    }

    /// Return the full [`PayoutBinding`] record for `seller`, if any.
    pub fn binding_of(env: Env, seller: Address) -> Option<PayoutBinding> {
        storage::get_binding(&env, &seller)
    }

    /// Configure the contract-wide rebind cooldown duration (in ledgers).
    pub fn set_cooldown(env: Env, cooldown_ledgers: u32) {
        storage::set_cooldown(&env, cooldown_ledgers);
    }

    /// Return the active rebind cooldown duration (defaults to `100` ledgers).
    pub fn cooldown(env: Env) -> u32 {
        storage::get_cooldown(&env)
    }
}
