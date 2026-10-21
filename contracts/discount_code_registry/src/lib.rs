//! Discount code registry with an expiry ledger and a per-code usage cap.
//!
//! An admin registers uppercase codes. A later redeem call succeeds while
//! `now <= expires_at` and the code still has remaining uses, then increments
//! the use counter. See `README.md` for the rules and the error priority.
//!
//! This crate is the registry primitive. It is not a Soroban contract, it
//! does not depend on `soroban-sdk`, and it is not wired into the Quittance
//! invoice or payment flow.

#![deny(missing_docs)]
#![forbid(unsafe_code)]

mod code;
mod error;
mod registry;

pub use crate::code::{validate_code, MAX_CODE_LEN};
pub use crate::error::DiscountError;
pub use crate::registry::{CodeSnapshot, DiscountRegistry};
