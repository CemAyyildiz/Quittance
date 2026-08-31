//! `invoice-claim` — Quittance invoice claim hash helper.
//!
//! Produces a **deterministic, domain-separated SHA-256 hash** over a
//! small structured tuple of fields that together identify a claim
//! against a Quittance invoice:
//!
//! | Field      | Type    | Meaning                                                |
//! |------------|---------|--------------------------------------------------------|
//! | `seller`   | string  | Stellar public key of the seller in StrKey form.       |
//! | `amount`   | u64     | Invoice amount in stroops (1 XLM == 10_000_000).       |
//! | `memo`     | string  | Quittance invoice memo (e.g. `INV-LX5R2-7HQA91WX`).    |
//! | `expiry`   | u64     | Unix timestamp (seconds) at which the invoice expires. |
//!
//! The hash is built so that a future on-chain Soroban contract can
//! reproduce the same 32-byte digest by emitting the **exact same
//! byte preimage** via `env.crypto().sha256` — both this crate (via
//! the `sha2` crate) and Soroban (via the host `sha256` function)
//! implement FIPS 180-4.
//!
//! # Why a domain separator?
//!
//! Without one, an arbitrary preimage could clash with a hash produced
//! by a *different* subsystem for a different purpose. The fixed
//! prefix `Quittance/InvoiceClaim/v1` makes these hashes uniquely
//! namespaced so collisions are limited to this subsystem.
//!
//! # Stability
//!
//! - The domain label, the field ordering, and the field encoding are
//!   **part of the public ABI**. Changing either is a breaking change
//!   and requires both a major version bump of this crate *and* a
//!   matching change in any on-chain consumer.
//! - Adding a new field **below** the existing ones (with a never-used
//!   tag) is backward-compatible: SHA-256 over a strictly longer
//!   preimage produces a strictly different digest, so no existing
//!   claim hash is invalidated.

#![deny(unsafe_code)]
#![deny(unused_must_use)]
#![forbid(missing_docs)]

use sha2::{Digest, Sha256};

/// Canonical domain label for Quittance v1 invoice claim hashes.
///
/// Format mirrors EIP-712 domain separators:
/// `<product> / <feature> / <version>`.
pub const DOMAIN: &[u8] = b"Quittance/InvoiceClaim/v1";

/// 32-byte SHA-256 invoice claim hash returned from [`compute`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ClaimHash([u8; 32]);

impl ClaimHash {
    /// Raw bytes of the hash (length always 32).
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    /// Lowercase hex encoding of the hash (always 64 characters).
    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }
}

impl core::fmt::Display for ClaimHash {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(&self.to_hex())
    }
}

/// Compute the domain-separated SHA-256 invoice claim hash.
///
/// Calling this twice with byte-identical inputs always yields equal
/// hashes. Using a *different* `domain` for the same fields yields a
/// different hash, so consumers can namespace their own claims without
/// colliding with the canonical Quittance namespace.
///
/// Default domain is [`DOMAIN`].
pub fn compute(seller: &str, amount: u64, memo: &str, expiry: u64) -> ClaimHash {
    compute_with_domain(DOMAIN, seller, amount, memo, expiry)
}

/// Current preimage version (encoded as `u32_be(VERSION)` immediately
/// after the domain block in the preimage).
///
/// Bumped only when the byte layout changes in a backward-incompatible
/// way. Adding a new field below the existing ones with a fresh,
/// never-used tag is backward-compatible and does NOT require a
/// version bump, because SHA-256 over the same prefix plus new bytes
/// produces a strictly different digest.
pub const VERSION: u32 = 1;

/// Compute the hash under a custom domain.
///
/// Exposed so callers (e.g. a future per-seller or per-network
/// variant) can namespace their own claim digests without colliding
/// with [`DOMAIN`].
pub fn compute_with_domain(
    domain: &[u8],
    seller: &str,
    amount: u64,
    memo: &str,
    expiry: u64,
) -> ClaimHash {
    let mut hasher = Sha256::new();
    // The preimage layout mirrors
    // `contracts/quittance_receipt_hash/src/encoding.rs`:
    //
    //   domain block → version → consumer fields
    //
    // Changing the order of these blocks would silently invalidate
    // every existing claim hash, so consumers that produce the same
    // hash on-chain (via `env.crypto().sha256`) must follow this
    // exact byte layout.
    hasher.update((domain.len() as u32).to_be_bytes());
    hasher.update(domain);
    hasher.update(VERSION.to_be_bytes());
    write_field(&mut hasher, b"seller", seller.as_bytes());
    write_amount(&mut hasher, amount);
    write_field(&mut hasher, b"memo", memo.as_bytes());
    write_amount(&mut hasher, expiry);

    let digest = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(digest.as_slice());
    ClaimHash(out)
}

fn write_amount(hasher: &mut Sha256, value: u64) {
    hasher.update(value.to_be_bytes());
}

fn write_field(hasher: &mut Sha256, tag: &[u8], value: &[u8]) {
    hasher.update((tag.len() as u32).to_be_bytes());
    hasher.update(tag);
    hasher.update((value.len() as u32).to_be_bytes());
    hasher.update(value);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> (&'static str, u64, &'static str, u64) {
        (
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            100_000_000u64,
            "INV-LX5R2-7HQA91WX",
            1_700_000_000u64,
        )
    }

    // ── shape ────────────────────────────────────────────────────────

    #[test]
    fn hash_is_32_bytes() {
        let (seller, amount, memo, expiry) = sample();
        let h = compute(seller, amount, memo, expiry);
        assert_eq!(h.as_bytes().len(), 32);
    }

    #[test]
    fn hex_is_64_chars_and_lowercase() {
        let (seller, amount, memo, expiry) = sample();
        let hex = compute(seller, amount, memo, expiry).to_hex();
        assert_eq!(hex.len(), 64);
        for ch in hex.chars() {
            assert!(
                ch.is_ascii_hexdigit() && !ch.is_ascii_uppercase(),
                "expected lowercase hex, got {:?}",
                ch
            );
        }
    }

    // ── stability ────────────────────────────────────────────────────

    #[test]
    fn same_inputs_yield_same_hash() {
        let (seller, amount, memo, expiry) = sample();
        let h1 = compute(seller, amount, memo, expiry);
        let h2 = compute(seller, amount, memo, expiry);
        assert_eq!(h1, h2);
    }

    #[test]
    fn sample_fixture_matches_pinned_hex_digest() {
        // Frozen SHA-256 regression vector for the existing sample
        // fixture (seller / amount / memo / expiry as in [`sample`]).
        // The hex digest is part of the public contract of this crate:
        // any change to the domain label, `VERSION`, field order, or
        // field encoding changes it, so this test pins the exact byte
        // layout for external verifiers. The same value is documented
        // in the crate README.
        let (seller, amount, memo, expiry) = sample();
        let expected = "5b682a8e9e3b524aad6046bf0782a7230c634412b0aa6cf1671e9de625f19cc5";
        assert_eq!(compute(seller, amount, memo, expiry).to_hex(), expected);
    }

    #[test]
    fn deterministic_across_calls() {
        let (seller, amount, memo, expiry) = sample();
        let hashes: Vec<ClaimHash> = (0..10)
            .map(|_| compute(seller, amount, memo, expiry))
            .collect();
        for h in &hashes[1..] {
            assert_eq!(hashes[0], *h);
        }
    }

    // ── input sensitivity ───────────────────────────────────────────

    #[test]
    fn different_seller_changes_hash() {
        let (_, amount, memo, expiry) = sample();
        let h1 = compute("SellerA", amount, memo, expiry);
        let h2 = compute("SellerB", amount, memo, expiry);
        assert_ne!(h1, h2);
    }

    #[test]
    fn different_amount_changes_hash() {
        let (seller, _, memo, expiry) = sample();
        let h1 = compute(seller, 100_000_000, memo, expiry);
        let h2 = compute(seller, 100_000_001, memo, expiry);
        assert_ne!(h1, h2);
    }

    #[test]
    fn different_memo_changes_hash() {
        let (seller, amount, _, expiry) = sample();
        let h1 = compute(seller, amount, "INV-A", expiry);
        let h2 = compute(seller, amount, "INV-B", expiry);
        assert_ne!(h1, h2);
    }

    #[test]
    fn different_expiry_changes_hash() {
        let (seller, amount, memo, _) = sample();
        let h1 = compute(seller, amount, memo, 1_700_000_000);
        let h2 = compute(seller, amount, memo, 1_700_000_001);
        assert_ne!(h1, h2);
    }

    #[test]
    fn different_domain_changes_hash() {
        let (seller, amount, memo, expiry) = sample();
        let default = compute_with_domain(DOMAIN, seller, amount, memo, expiry);
        let custom =
            compute_with_domain(b"Quittance/InvoiceClaim/v2", seller, amount, memo, expiry);
        assert_ne!(
            default, custom,
            "the domain separator is part of the preimage"
        );
    }

    // ── boundary cases ──────────────────────────────────────────────

    #[test]
    fn empty_strings_still_produce_hash() {
        // Empty fields are unusual but legal; this guarantees the
        // length-prefix encoding does not silently collapse them.
        let h1 = compute("", 0, "", 0);
        let h2 = compute("", 0, "", 0);
        assert_eq!(h1, h2);

        // And any deviation from `(all-empty, all-zero)` must be
        // detected — including the difference between "" and a single
        // byte string.
        let h3 = compute("a", 0, "", 0);
        assert_ne!(h1, h3);
    }

    #[test]
    fn zero_amount_is_distinct_from_one_stroop() {
        let (seller, _, memo, expiry) = sample();
        let h0 = compute(seller, 0, memo, expiry);
        let h1 = compute(seller, 1, memo, expiry);
        assert_ne!(h0, h1);
    }

    #[test]
    fn boundary_amounts_are_distinct() {
        let (seller, _, memo, expiry) = sample();
        let h_max_minus_1 = compute(seller, u64::MAX - 1, memo, expiry);
        let h_max = compute(seller, u64::MAX, memo, expiry);
        assert_ne!(h_max_minus_1, h_max);
    }

    #[test]
    fn boundary_timestamps_are_distinct() {
        let (seller, amount, memo, _) = sample();
        let h_now = compute(seller, amount, memo, 1_700_000_000);
        let h_later = compute(seller, amount, memo, 1_700_000_001);
        assert_ne!(h_now, h_later);
    }

    #[test]
    fn field_reorder_changes_hash() {
        // The preimage writes each field under a distinct tag
        // (`"seller"` vs `"memo"`), swapping their values produces
        // different hashes. This locks the public field order so a
        // future arg-reorder refactor cannot silently produce a valid
        // hash for an invalid input.
        let h_a_b = compute("a", 0, "b", 0);
        let h_b_a = compute("b", 0, "a", 0);
        assert_ne!(h_a_b, h_b_a);
    }
}
