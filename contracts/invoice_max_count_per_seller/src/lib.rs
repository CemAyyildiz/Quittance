//! `invoice-max-count-per-seller` — standalone Soroban contract:
//! lifetime invoice count cap per seller.
//!
//! Caps the total number of invoices a single seller may ever create. Once a
//! seller reaches the configured cap, any further `record_invoice` call is
//! rejected with [`InvoiceCapError::CapExceeded`].
//!
//! # What it does
//!
//! `record_invoice(seller)` increments that seller's lifetime invoice count by
//! one and returns the new total. The count starts at `0` ("nothing created
//! yet"), so the first successful call returns `1`. When the count has already
//! reached the cap, the call fails and the stored count is left unchanged.
//!
//! # Rules
//!
//! 1. **Independence** — each seller owns a counter; recording for one seller
//!    never changes another's.
//! 2. **Monotonicity** — a count only ever moves forward by exactly one.
//! 3. **Hard cap** — a count at the cap cannot be advanced; the call fails
//!    instead of silently dropping the invoice.
//! 4. **Immutable cap** — the cap is set once at construction and cannot be
//!    changed afterwards.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `__constructor(cap)` | `fn(Env, u32)` | Set the per-seller cap. |
//! | `record_invoice(seller)` | `fn(Env, Address) -> Result<u32, InvoiceCapError>` | Record one invoice, return new count or error. |
//! | `count_for(seller)` | `fn(Env, Address) -> u32` | Current invoice count (0 when none). |
//! | `remaining_for(seller)` | `fn(Env, Address) -> u32` | Invoices `seller` may still create. |
//!
//! # Example
//!
//! ```rust
//! # use invoice_max_count_per_seller::{InvoiceMaxCountPerSeller, InvoiceMaxCountPerSellerClient};
//! # use soroban_sdk::{testutils::Address as _, Address, Env};
//! let env = Env::default();
//! env.mock_all_auths();
//! let seller = Address::generate(&env);
//! let contract_id = env.register(InvoiceMaxCountPerSeller, (3u32,));
//! let client = InvoiceMaxCountPerSellerClient::new(&env, &contract_id);
//!
//! assert_eq!(client.record_invoice(&seller), 1);
//! assert_eq!(client.record_invoice(&seller), 2);
//! assert_eq!(client.record_invoice(&seller), 3);
//! assert!(client.try_record_invoice(&seller).is_err());
//! ```

#![no_std]
#![deny(unsafe_code)]

mod cap;
mod storage;
mod types;

pub use crate::types::InvoiceCapError;

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env};

/// Lifetime invoice count cap per seller.
#[contract]
pub struct InvoiceMaxCountPerSeller;

#[contractimpl]
impl InvoiceMaxCountPerSeller {
    /// Initialise the contract with the given per-seller invoice cap.
    ///
    /// Panics if `cap` is zero — a zero cap would immediately block every
    /// seller, which is almost certainly a misconfiguration.
    pub fn __constructor(env: Env, cap: u32) {
        if let Err(e) = cap::validate_cap(cap) {
            panic_with_error!(&env, e);
        }
        storage::set_cap(&env, cap);
    }

    /// Record one invoice for `seller` and return the new lifetime count.
    ///
    /// Returns [`InvoiceCapError::CapExceeded`] when the seller's count has
    /// already reached the configured cap; the stored count is unchanged.
    pub fn record_invoice(env: Env, seller: Address) -> Result<u32, InvoiceCapError> {
        let cap = storage::get_cap(&env);
        let current = storage::get_count(&env, &seller);
        let next = cap::try_increment(current, cap)?;
        storage::set_count(&env, &seller, next);
        Ok(next)
    }

    /// Return the number of invoices `seller` has created so far.
    ///
    /// Returns `0` when the seller has never called `record_invoice`.
    pub fn count_for(env: Env, seller: Address) -> u32 {
        storage::get_count(&env, &seller)
    }

    /// Return how many more invoices `seller` may create before hitting the cap.
    pub fn remaining_for(env: Env, seller: Address) -> u32 {
        let cap = storage::get_cap(&env);
        let current = storage::get_count(&env, &seller);
        cap::remaining(current, cap)
    }
}
