//! `receipt-counter-per-seller` — standalone Soroban contract: independent
//! per-seller receipt counter.
//!
//! Issues a monotonically increasing receipt number to a seller, scoped to that
//! seller alone. Two sellers never share a sequence: advancing one seller's
//! counter leaves every other seller's counter untouched, so the primitive is
//! decoupled from any global counter.
//!
//! # What it does
//!
//! `next_receipt_no(seller)` returns the next receipt number for `seller` and
//! advances that seller's counter by one. The counter starts at zero ("nothing
//! issued yet"), so the first receipt number a seller ever receives is `1`.
//!
//! # Rules
//!
//! 1. **Independence** — each seller owns a counter; issuing to one seller
//!    never changes another's.
//! 2. **Monotonicity** — a counter only ever moves forward by exactly one.
//! 3. **No overflow** — a counter at `u64::MAX` cannot be advanced and the
//!    call fails instead of wrapping around to zero.
//! 4. **No reseeding** — a counter must start at zero; a non-zero seed is
//!    rejected because it would let a seller skip receipt numbers.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `next_receipt_no(seller)` | `fn(Env, Address) -> Result<u64, CounterError>` | Issue the next receipt number to `seller`. |
//! | `last_receipt_no(seller)` | `fn(Env, Address) -> u64` | Read the last number issued to `seller` (0 when none). |
//! | `peek_next_receipt_no(seller)` | `fn(Env, Address) -> Result<u64, CounterError>` | Read the number that would be issued next, without advancing. |
//! | `CounterError` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//!
//! # Usage
//!
//! ```rust
//! use receipt_counter_per_seller::{ReceiptCounterPerSeller, ReceiptCounterPerSellerClient};
//! use soroban_sdk::{testutils::Address as _, Address, Env};
//!
//! let env = Env::default();
//! env.mock_all_auths();
//! let seller = Address::generate(&env);
//! let contract_id = env.register(ReceiptCounterPerSeller, ());
//! let client = ReceiptCounterPerSellerClient::new(&env, &contract_id);
//!
//! assert_eq!(client.next_receipt_no(&seller), 1);
//! assert_eq!(client.next_receipt_no(&seller), 2);
//! assert_eq!(client.last_receipt_no(&seller), 2);
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cd contracts/receipt_counter_per_seller
//! cargo test
//! cargo clippy --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod counter;
mod storage;
mod types;

pub use crate::counter::{next_after, upcoming, validate_seed};
pub use crate::types::{CounterError, FIRST_RECEIPT_NO};

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Independent per-seller receipt counter.
#[contract]
pub struct ReceiptCounterPerSeller;

#[contractimpl]
impl ReceiptCounterPerSeller {
    /// Issue the next receipt number to `seller` and advance that seller's
    /// counter.
    ///
    /// Returns [`CounterError::CounterOverflow`] if the seller's counter has
    /// already reached `u64::MAX`.
    pub fn next_receipt_no(env: Env, seller: Address) -> Result<u64, CounterError> {
        let current = storage::last_issued(&env, &seller);
        let next = next_after(current)?;
        storage::set_last_issued(&env, &seller, next);
        Ok(next)
    }

    /// Return the last receipt number issued to `seller`, or `0` when the
    /// seller has not been issued one yet.
    pub fn last_receipt_no(env: Env, seller: Address) -> u64 {
        storage::last_issued(&env, &seller)
    }

    /// Return the receipt number that `next_receipt_no` would issue to
    /// `seller` right now, without advancing the counter.
    ///
    /// Returns [`CounterError::CounterOverflow`] if the counter has already
    /// reached `u64::MAX`.
    pub fn peek_next_receipt_no(env: Env, seller: Address) -> Result<u64, CounterError> {
        let current = storage::last_issued(&env, &seller);
        upcoming(current)
    }
}
