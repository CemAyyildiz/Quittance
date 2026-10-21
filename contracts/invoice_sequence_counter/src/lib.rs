//! Per-seller invoice sequence counter.
//!
//! Off-chain equivalent of a Soroban contract that issues monotonically
//! increasing invoice sequence numbers and detects collisions and
//! out-of-order submissions. The contract-shaped API is:
//!
//! - `next_seq(seller: Address) -> u64`
//! - `is_valid_seq(seller: Address, candidate: u64) -> bool`
//!
//! This crate keeps that behavior in pure Rust. `seller` is a `&str`
//! rather than a Soroban `Address`, and empty sellers return
//! [`SequenceError::EmptySeller`] instead of trapping. There is no
//! `soroban-sdk` dependency. The crate is not a member of the
//! `contracts` workspace and is not wired into Quittance's invoice flow.
//!
//! See `README.md` for the sequencing rules and the build commands.

#![deny(missing_docs)]
#![forbid(unsafe_code)]

mod counter;
mod types;

pub use crate::counter::InvoiceSequenceCounter;
pub use crate::types::{SellerId, SequenceError, SequenceVerdict, FIRST_SEQUENCE};
