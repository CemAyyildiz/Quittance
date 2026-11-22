//! Fixed-point payment split calculator for Quittance invoices.
//!
//! Pure helper crate that splits a payment amount across up to N recipients
//! by basis-point shares, assigning any rounding remainder to a designated
//! recipient so the parts always sum exactly to the input.
//!
//! The public API is:
//!
//! ```text
//! split_amount(total: i128, shares_bps: Vec<u32>, remainder_index: u32)
//!     -> Result<Vec<i128>, SplitError>
//! ```
//!
//! This crate is standalone: it is not a member of the root
//! `contracts/Cargo.toml` workspace and is not wired into the frontend, backend,
//! or any other contract.

mod logic;
mod types;

pub use logic::split_amount;
pub use types::{BPS_DENOMINATOR, SplitError};
