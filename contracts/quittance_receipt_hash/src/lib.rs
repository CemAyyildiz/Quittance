//! Domain-separated SHA-256 receipt hash and on-chain anchor for Quittance
//! payment proofs on Stellar.
//!
//! See `README.md` for the byte-level encoding specification. The hashing
//! side ([`compute`], [`ReceiptFields`]) is pure Rust; both this crate (via the
//! `sha2` crate) and Soroban (via `env.crypto().sha256`) implement FIPS 180-4
//! SHA-256, so the same fields produce the same digest on and off chain.
//!
//! The write side is the [`QuittanceAnchor`] Soroban contract: a wallet calls
//! its `anchor` entry point to persist the invoice id and canonical digest in
//! instance storage. It is not wired into the Next.js or Express MVP demos in
//! this PR.

#![no_std]
#![deny(missing_docs)]

extern crate alloc;

#[cfg(test)]
extern crate std;

// The Soroban contract macros generate undocumented client/helper items, so the
// crate-level `missing_docs` guard is lifted for this module only.
#[allow(missing_docs)]
mod anchor;
mod domain;
mod encoding;
mod hash;
mod receipt;

pub use crate::anchor::{
    AnchorError, QuittanceAnchor, QuittanceAnchorClient, ReceiptAnchor, DIGEST_LEN,
};
pub use crate::domain::DomainSeparator;
pub use crate::hash::{compute, compute_hex, ReceiptHash};
pub use crate::receipt::{Asset, BuildError, ReceiptFields, ReceiptFieldsBuilder};
