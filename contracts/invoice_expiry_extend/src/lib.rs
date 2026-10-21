//! `invoice-expiry-extend` — lets an issuer extend an invoice's expiry
//! exactly once, keeping an audit trail of the old and new value.
//!
//! This is a standalone primitive: it is not wired into Quittance's actual
//! invoice/payment flow in this change. A Soroban contract or off-chain
//! service can call [`ExpiryExtender::extend_expiry`] when an issuer
//! requests more time on an invoice, and later read
//! [`ExpiryExtender::history`] to show what changed and by whom.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod extender;
mod types;

pub use crate::extender::ExpiryExtender;
pub use crate::types::{ExtendError, ExtensionRecord};
