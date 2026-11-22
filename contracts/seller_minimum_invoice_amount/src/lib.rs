#![no_std]

//! Standalone Soroban contract: per-seller minimum invoice amount.
//!
//! Admin sets a minimum invoice amount per seller; invoice creation below
//! that minimum is rejected.

mod storage;
mod types;

pub use types::Error;

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct SellerMinimumInvoiceAmount;

#[contractimpl]
impl SellerMinimumInvoiceAmount {
    /// Set the minimum invoice amount (`stroops`, `i128`) for `seller`.
    ///
    /// Negative minimums are rejected with [`Error::NegativeMinimum`].
    pub fn set_minimum(env: Env, seller: Address, minimum: i128) -> Result<(), Error> {
        if minimum < 0 {
            return Err(Error::NegativeMinimum);
        }
        storage::set_minimum_of(&env, &seller, minimum);
        Ok(())
    }

    /// Return the minimum invoice amount for `seller`.
    ///
    /// Returns [`DEFAULT_MINIMUM`] when the seller has no stored override.
    pub fn minimum_for(env: Env, seller: Address) -> i128 {
        storage::minimum_of(&env, &seller)
    }

    /// Return whether `amount` is valid for `seller`.
    ///
    /// A seller is valid for any non-negative amount at or above their
    /// minimum; negative amounts are therefore never valid.
    pub fn is_valid_amount(env: Env, seller: Address, amount: i128) -> bool {
        amount >= storage::minimum_of(&env, &seller)
    }
}
