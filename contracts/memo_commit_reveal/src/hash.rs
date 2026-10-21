//! Pure SHA-256 helpers for memo hashing.
//!
//! The contract hashes memos with the Soroban host function
//! `env.crypto().sha256`. This module provides the identical digest
//! off-chain so that callers can compute the value to commit without
//! running the contract. Both implementations are FIPS 180-4 SHA-256 and
//! therefore produce byte-identical results.

use sha2::{Digest, Sha256};

/// Maximum length of a memo, in bytes.
///
/// The value matches Stellar's `MEMO_TEXT` limit, so a memo that this
/// contract accepts is also a memo the network accepts.
pub const MAX_MEMO_BYTES: u32 = 28;

/// Compute the SHA-256 digest of `memo`.
///
/// # Examples
///
/// ```
/// use memo_commit_reveal::memo_hash;
///
/// assert_eq!(memo_hash(b"abc").len(), 32);
/// ```
#[must_use]
pub fn memo_hash(memo: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(memo);
    let digest = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(digest.as_slice());
    out
}

/// Compute the SHA-256 digest of `memo` and render it as 64 lowercase ASCII
/// hex bytes.
///
/// The result is a fixed-size array instead of a `String` so that the helper
/// stays allocation-free and can be used from a `no_std` Soroban contract as
/// well as from off-chain tooling.
///
/// # Examples
///
/// ```
/// use memo_commit_reveal::memo_hash_hex;
///
/// // SHA-256 of the empty byte string.
/// assert_eq!(
///     memo_hash_hex(b""),
///     *b"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
/// );
/// ```
#[must_use]
pub fn memo_hash_hex(memo: &[u8]) -> [u8; 64] {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";

    let digest = memo_hash(memo);
    let mut out = [0u8; 64];
    for (index, byte) in digest.iter().enumerate() {
        out[index * 2] = DIGITS[usize::from(byte >> 4)];
        out[index * 2 + 1] = DIGITS[usize::from(byte & 0x0f)];
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_memo_hashes_to_the_known_digest() {
        assert_eq!(
            memo_hash_hex(b""),
            *b"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn known_vector_matches() {
        // SHA-256("abc")
        assert_eq!(
            memo_hash_hex(b"abc"),
            *b"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn hash_is_32_bytes() {
        assert_eq!(memo_hash(b"INV-42").len(), 32);
    }

    #[test]
    fn hashing_is_deterministic() {
        assert_eq!(memo_hash(b"INV-42"), memo_hash(b"INV-42"));
    }

    #[test]
    fn different_memos_hash_differently() {
        assert_ne!(memo_hash(b"INV-42"), memo_hash(b"INV-43"));
    }

    #[test]
    fn max_memo_bytes_is_the_stellar_memo_text_limit() {
        assert_eq!(MAX_MEMO_BYTES, 28);
    }
}
