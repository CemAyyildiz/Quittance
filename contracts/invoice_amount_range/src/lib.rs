//! `invoice-amount-range` — standalone Soroban contract:
//! per-seller invoice amount range validator.
//!
//! Validates an invoice amount against a per-seller configured min/max range.
//! Each seller independently configures their own acceptable band; one
//! seller's range never affects another's.
//!
//! # What it does
//!
//! `set_range(seller, min, max)` stores an inclusive `[min, max]` band for
//! `seller`. `in_range(seller, amount)` returns `true` when `amount` falls
//! within that band. A seller with no configured range is treated as
//! unconstrained — `in_range` returns `true` for any non-negative amount
//! until `set_range` is called.
//!
//! # Rules
//!
//! 1. **Independence** — each seller owns their range; changing one seller's
//!    range leaves every other seller's range untouched.
//! 2. **Inclusive bounds** — both `min` and `max` are included.
//! 3. **Valid range only** — `min` must be ≤ `max` and both must be
//!    non-negative; amounts are denominated in stroops.
//! 4. **Default: open** — no configured range means any non-negative amount
//!    is accepted.
//! 5. **Updatable** — calling `set_range` again replaces the previous range.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `set_range(seller, min, max)` | `fn(Env, Address, i128, i128) -> Result<(), RangeError>` | Register or update `seller`'s amount range. |
//! | `in_range(seller, amount)` | `fn(Env, Address, i128) -> bool` | Whether `amount` falls within `seller`'s range. |
//!
//! # Example
//!
//! ```rust
//! # use invoice_amount_range::{InvoiceAmountRange, InvoiceAmountRangeClient};
//! # use soroban_sdk::{testutils::Address as _, Address, Env};
//! let env = Env::default();
//! env.mock_all_auths();
//! let seller = Address::generate(&env);
//! let contract_id = env.register(InvoiceAmountRange, ());
//! let client = InvoiceAmountRangeClient::new(&env, &contract_id);
//!
//! client.set_range(&seller, &100, &1_000);
//! assert!(client.in_range(&seller, &500));
//! assert!(!client.in_range(&seller, &99));
//! assert!(!client.in_range(&seller, &1_001));
//! ```

#![no_std]
#![deny(unsafe_code)]

mod range;
mod storage;
mod types;

pub use crate::types::RangeError;

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Per-seller invoice amount range validator.
#[contract]
pub struct InvoiceAmountRange;

#[contractimpl]
impl InvoiceAmountRange {
    /// Register or update the acceptable invoice amount range for `seller`.
    ///
    /// Both bounds are inclusive. `min` and `max` must be non-negative and
    /// `min` must be ≤ `max`; otherwise [`RangeError::InvalidRange`] is
    /// returned and nothing is stored.
    ///
    /// Calling this again for the same seller replaces the previous range.
    pub fn set_range(
        env: Env,
        seller: Address,
        min: i128,
        max: i128,
    ) -> Result<(), RangeError> {
        let validated = range::new_range(min, max)?;
        storage::set_range(&env, &seller, &validated);
        Ok(())
    }

    /// Return `true` when `amount` falls within `seller`'s configured
    /// `[min, max]` range (both endpoints inclusive).
    ///
    /// If `seller` has no configured range, returns `true` for any
    /// non-negative amount and `false` for any negative amount — no range
    /// configured means the seller imposes no restriction, but a negative
    /// amount is never a valid invoice denomination.
    pub fn in_range(env: Env, seller: Address, amount: i128) -> bool {
        match storage::get_range(&env, &seller) {
            Some(r) => range::contains(&r, amount),
            // No range set: open — accept any non-negative amount.
            None => amount >= 0,
        }
    }
}
