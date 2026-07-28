//! `usdc-testnet-issuer` — Soroban-compatible accessor for the Stellar
//! testnet USDC issuer constant used by Quittance.
//!
//! This crate exposes a single read-only accessor. It does not create a
//! trustline, does not contact Horizon, does not read environment variables,
//! and does not pull any runtime configuration. Callers can treat the
//! returned value as the canonical, documented testnet USDC issuer that
//! Quittance uses across its docs and front-end asset list
//! (`frontend/lib/assets.ts`).
//!
//! The crate is intentionally minimal so it can be vendored into a Soroban
//! contract, an off-chain Rust service, or a CLI utility without dragging in
//! additional stateful dependencies.

#![cfg_attr(not(test), no_std)]

/// Stellar public key of the testnet USDC issuer used by Quittance.
///
/// This is the same value documented in Quittance's front-end asset list
/// (`frontend/lib/assets.ts`) and is the standard testnet USDC issuer on
/// the public Stellar testnet.
pub const USDC_TESTNET_ISSUER: &str =
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/// Read-only accessor returning the documented Stellar testnet USDC issuer.
///
/// Returns the same value as [`USDC_TESTNET_ISSUER`]. Exposed as a function
/// so consumers that prefer a uniform "no raw constants, functions only"
/// boundary still have a stable public surface.
pub fn usdc_testnet_issuer() -> &'static str {
    USDC_TESTNET_ISSUER
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The documented Stellar testnet USDC issuer value used by Quittance.
    /// Kept as a module-local constant so the asserted strings live in
    /// exactly one place per test.
    const EXPECTED: &str = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

    #[test]
    fn constant_matches_documented_testnet_value() {
        assert_eq!(USDC_TESTNET_ISSUER, EXPECTED);
    }

    #[test]
    fn accessor_returns_documented_testnet_value() {
        assert_eq!(usdc_testnet_issuer(), EXPECTED);
    }

    /// Stellar public keys are 56 characters of StrKey-encoded ED25519.
    /// Guarding against accidental truncation keeps the constant safe to
    /// paste into payment / trustline builders downstream.
    #[test]
    fn constant_has_stellar_public_key_length() {
        assert_eq!(USDC_TESTNET_ISSUER.len(), 56);
    }
}
