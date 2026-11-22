//! `refund-reason-code` — standalone Soroban contract: an immutable, fixed-enum
//! refund reason code.
//!
//! Records a reason code from a fixed set alongside a refund, keyed by refund
//! id. Once a reason is stored for a refund id it can never be changed: a later
//! `record_reason` call fails and the original code stays in place. The only
//! way to observe a stored reason is to read it back.
//!
//! # What it does
//!
//! `record_reason(refund_id, reason)` binds a refund id to one
//! [`ReasonCode`]. The first successful call writes the code; every later call
//! for the same refund id returns [`Error::AlreadyRecorded`] and changes
//! nothing — not even when it repeats the same code.
//!
//! `reason_for(refund_id)` returns the stored code, or `None` when nothing has
//! been recorded yet.
//!
//! # Rules
//!
//! 1. **One reason per refund id** — a refund is explained by exactly one
//!    reason code.
//! 2. **The record is immutable** — the stored code is never overwritten, and
//!    re-recording the same code is rejected as well.
//! 3. **Fixed enum only** — the only accepted values are the variants of
//!    [`ReasonCode`], so no free-form text can enter storage.
//! 4. **Reads are free** — `reason_for` never mutates the record and can be
//!    called any number of times.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `record_reason(refund_id, reason)` | `fn(Env, Symbol, ReasonCode) -> Result<(), Error>` | Store the reason for a refund id, once. |
//! | `reason_for(refund_id)` | `fn(Env, Symbol) -> Option<ReasonCode>` | Read the stored reason, if any. |
//! | `ReasonCode` | `enum` | The fixed set of refund reasons. |
//! | `Error` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//!
//! # Sequence
//!
//! ```text
//! record_reason(refund_1, DuplicateCharge)  -> Ok(())
//! reason_for(refund_1)                      -> Some(DuplicateCharge)
//! record_reason(refund_1, Fraudulent)       -> Err(AlreadyRecorded)
//! reason_for(refund_1)                      -> Some(DuplicateCharge)   // unchanged
//! reason_for(refund_2)                      -> None                  // never recorded
//! ```
//!
//! # Usage
//!
//! ```rust
//! use refund_reason_code::{ReasonCode, RefundReasonCode, RefundReasonCodeClient};
//! use soroban_sdk::{symbol_short, Env};
//!
//! let env = Env::default();
//! let contract_id = env.register(RefundReasonCode, ());
//! let client = RefundReasonCodeClient::new(&env, &contract_id);
//!
//! let refund = symbol_short!("RFND1");
//!
//! client.record_reason(&refund, &ReasonCode::DuplicateCharge);
//! assert_eq!(client.reason_for(&refund), Some(ReasonCode::DuplicateCharge));
//! assert!(client
//!     .try_record_reason(&refund, &ReasonCode::Fraudulent)
//!     .is_err());
//! assert_eq!(client.reason_for(&refund), Some(ReasonCode::DuplicateCharge));
//! ```
//!
//! # Scope
//!
//! This is a self-contained learning/utility contract in the same family as
//! `contracts/quittance_receipt_hash`, `contracts/destination_guard`, and
//! `contracts/auth_one_address`. It is not a workspace member, it makes no
//! cross-contract calls, and it is not wired into the Quittance frontend,
//! backend, or invoice flow.
//!
//! # Running the tests
//!
//! ```bash
//! cargo test --manifest-path contracts/refund_reason_code/Cargo.toml
//! cargo clippy --manifest-path contracts/refund_reason_code/Cargo.toml --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod types;

pub use crate::types::{Error, ReasonCode};

use soroban_sdk::{contract, contractimpl, Env, Symbol};

/// Immutable refund reason code.
#[contract]
pub struct RefundReasonCode;

#[contractimpl]
impl RefundReasonCode {
    /// Record `reason` for `refund_id`.
    ///
    /// The first successful call writes the reason. Any later call for the same
    /// refund id — whether it repeats the same code or names a different one —
    /// returns [`Error::AlreadyRecorded`] and leaves the stored reason
    /// untouched.
    ///
    /// Refund ids are independent: recording one never affects another.
    pub fn record_reason(env: Env, refund_id: Symbol, reason: ReasonCode) -> Result<(), Error> {
        logic::record(&env, &refund_id, reason)
    }

    /// Return the reason recorded for `refund_id`, or `None` when no reason has
    /// been recorded yet.
    ///
    /// Reading is side-effect free: the stored reason is never consumed and can
    /// be read back any number of times.
    pub fn reason_for(env: Env, refund_id: Symbol) -> Option<ReasonCode> {
        logic::read(&env, &refund_id)
    }
}
