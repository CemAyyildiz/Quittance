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

    /// RFC 4648 base32 alphabet used by Stellar StrKey-encoded addresses
    /// (A-Z followed by digits 2-7). The characters I, O, 0 and 1 are
    /// deliberately excluded from Stellar's base32 alphabet.
    const STELLAR_BASE32_ALPHABET: [char; 32] = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
        'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '2', '3', '4', '5', '6', '7',
    ];

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

    /// StrKey-encoded ED25519 public keys (accounts / issuers) always begin
    /// with the version byte that base32-encodes to the prefix 'G'. This is
    /// a structural guard that the constant is an account, not a secret
    /// seed (which would start with 'S') or some other key type.
    #[test]
    fn constant_starts_with_ed25519_strkey_prefix() {
        assert!(
            USDC_TESTNET_ISSUER.starts_with('G'),
            "Stellar ED25519 public keys must start with the 'G' StrKey prefix"
        );
    }

    /// Every character of a StrKey-encoded address must come from Stellar's
    /// RFC 4648 base32 alphabet (A-Z and 2-7). Characters outside this
    /// alphabet would make the constant an invalid Stellar address.
    #[test]
    fn constant_uses_only_stellar_base32_alphabet() {
        assert!(
            USDC_TESTNET_ISSUER
                .chars()
                .all(|c| STELLAR_BASE32_ALPHABET.contains(&c)),
            "constant contains characters outside the Stellar base32 alphabet"
        );
    }
}
