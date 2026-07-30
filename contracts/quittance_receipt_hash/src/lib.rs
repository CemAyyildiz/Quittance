//! Domain-separated SHA-256 receipt hash for Quittance payment proofs on
//! Stellar.
//!
//! See `README.md` for the byte-level encoding specification. This crate is
//! the hashing primitive; it is intentionally not wired into the Next.js or
//! Express MVP demos in this PR. A future Soroban contract can reproduce the
//! exact same hash on chain because both this crate (via the `sha2` crate)
//! and Soroban (via `env.crypto().sha256`) implement FIPS 180-4 SHA-256.

#![deny(missing_docs)]
#![forbid(unsafe_code)]

mod domain;
mod encoding;
mod hash;
mod receipt;

pub use crate::domain::DomainSeparator;
pub use crate::hash::{ReceiptHash, compute, compute_hex};
pub use crate::receipt::{Asset, BuildError, ReceiptFields, ReceiptFieldsBuilder};
