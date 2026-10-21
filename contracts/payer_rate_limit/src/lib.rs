//! `payer-rate-limit` — limits the number of payment attempts a single
//! payer address can make within a ledger window.
//!
//! This is a standalone primitive: it is not wired into Quittance's actual
//! invoice/payment flow in this change. A Soroban contract or off-chain
//! service can call [`PayerRateLimiter::record_attempt`] on every payment
//! attempt and check [`PayerRateLimiter::is_rate_limited`] before
//! accepting the next one.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod limiter;
mod types;

pub use crate::limiter::PayerRateLimiter;
