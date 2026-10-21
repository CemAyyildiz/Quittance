//! Late fee for an overdue Quittance invoice.
//!
//! The fee is `amount * days_overdue * fee_bps_per_day / 10_000`, capped at
//! `amount * max_fee_bps / 10_000`. Arithmetic is integer-only. This crate is
//! not wired into the Next.js or Express apps, and it does not call Soroban.

#![deny(missing_docs)]
#![forbid(unsafe_code)]

mod calc;
mod types;

pub use calc::late_fee;
pub use types::{LateFeeError, BPS_DENOMINATOR};
