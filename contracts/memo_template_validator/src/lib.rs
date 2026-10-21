//! `memo-template-validator` — validates a Quittance payment memo against
//! the `INV-<digits>` template.
//!
//! This is a standalone primitive: it is not wired into Quittance's actual
//! invoice/payment flow in this change. A Soroban contract or off-chain
//! service can call [`is_valid_memo`] before accepting a payment memo as a
//! valid invoice reference.
//!
//! # Template
//!
//! A valid memo is exactly the literal prefix `INV-` followed by one or
//! more ASCII digits (`0`-`9`) and nothing else. The prefix is
//! case-sensitive; no leading/trailing whitespace is tolerated.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod template;

pub use crate::template::{INVOICE_MEMO_PREFIX, is_valid_memo};
