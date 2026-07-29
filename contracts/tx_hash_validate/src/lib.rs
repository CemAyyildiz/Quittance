//! `tx-hash-validate`
//!
//! Pure Soroban helper: validate that a string is a well-formed 64-character
//! hex-encoded Soroban transaction hash.
//!
//! Soroban transaction hashes are SHA-256 digests of the transaction envelope
//! (32 bytes), conventionally rendered as 64 lowercase hex characters. This
//! crate verifies the length and character set **without** performing any
//! host-function calls — it is safe to use in `#![no_std]` environments both
//! on-chain (inside a Soroban contract) and off-chain (CLI tools, tests).
//!
//! # Usage
//!
//! ```ignore
//! use tx_hash_validate::{is_valid_tx_hash, TX_HASH_HEX_LEN};
//!
//! // Valid 64-char hex hash
//! let hash = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
//! assert!(is_valid_tx_hash(hash));
//!
//! // Too short
//! assert!(!is_valid_tx_hash("deadbeef"));
//!
//! // Invalid hex character ('g')
//! let bad = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678g";
//! assert!(!is_valid_tx_hash(bad));
//! ```

use soroban_sdk::contracterror;

/// The expected length of a Soroban transaction hash when represented as
/// hex: 32 bytes × 2 hex digits per byte = 64 characters.
pub const TX_HASH_HEX_LEN: usize = 64;

/// Errors produced during transaction hash validation.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TxHashError {
    /// The hash string has the wrong length (must be exactly 64 chars).
    InvalidLength = 1,
    /// The hash string contains a character that is not a valid hex digit
    /// (allowed: `0-9`, `a-f`, `A-F`).
    InvalidCharacter = 2,
}

/// Validate that `input` is a well-formed 64-character hex string.
///
/// Returns `Ok(())` on success, or a [`TxHashError`] describing the
/// first violation found.
///
/// # Examples
///
/// ```
/// use tx_hash_validate::{validate_tx_hash, TxHashError};
///
/// // Valid — 64 lowercase hex characters.
/// let valid = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
/// assert_eq!(validate_tx_hash(valid), Ok(()));
///
/// // Too short.
/// assert_eq!(validate_tx_hash("abc"), Err(TxHashError::InvalidLength));
///
/// // Contains 'g' which is not hex.
/// let bad = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678g";
/// assert_eq!(validate_tx_hash(bad), Err(TxHashError::InvalidCharacter));
/// ```
pub fn validate_tx_hash(input: &str) -> Result<(), TxHashError> {
    if input.len() != TX_HASH_HEX_LEN {
        return Err(TxHashError::InvalidLength);
    }

    if !input.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(TxHashError::InvalidCharacter);
    }

    Ok(())
}

/// Convenience wrapper: returns `true` when [`validate_tx_hash`] returns
/// `Ok(())`.
///
/// # Examples
///
/// ```
/// use tx_hash_validate::is_valid_tx_hash;
///
/// let valid = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
/// assert!(is_valid_tx_hash(valid));
///
/// assert!(!is_valid_tx_hash("not-a-valid-hash"));
/// ```
#[must_use = "the validation result is ignored; consider using `validate_tx_hash` if you need to distinguish the error reason"]
pub fn is_valid_tx_hash(input: &str) -> bool {
    validate_tx_hash(input).is_ok()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// A valid 64-char hex string (lowercase).
    const VALID_LOWER: &str =
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    /// A valid 64-char hex string (uppercase).
    const VALID_UPPER: &str =
        "ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789";

    /// A valid 64-char hex string (mixed case).
    const VALID_MIXED: &str =
        "AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789";

    /// A valid 64-char hex string using only digit characters.
    const VALID_DIGITS_ONLY: &str =
        "0123456789012345678901234567890123456789012345678901234567890123";

    // -----------------------------------------------------------------------
    // validate_tx_hash — happy path
    // -----------------------------------------------------------------------

    #[test]
    fn validate_accepts_lowercase() {
        assert_eq!(validate_tx_hash(VALID_LOWER), Ok(()));
    }

    #[test]
    fn validate_accepts_uppercase() {
        assert_eq!(validate_tx_hash(VALID_UPPER), Ok(()));
    }

    #[test]
    fn validate_accepts_mixed_case() {
        assert_eq!(validate_tx_hash(VALID_MIXED), Ok(()));
    }

    #[test]
    fn validate_accepts_digits_only() {
        assert_eq!(validate_tx_hash(VALID_DIGITS_ONLY), Ok(()));
    }

    // -----------------------------------------------------------------------
    // validate_tx_hash — length violations
    // -----------------------------------------------------------------------

    #[test]
    fn validate_rejects_empty_string() {
        assert_eq!(validate_tx_hash(""), Err(TxHashError::InvalidLength));
    }

    #[test]
    fn validate_rejects_too_short() {
        // 63 hex chars — one short.
        let short = &VALID_LOWER[..63];
        assert_eq!(validate_tx_hash(short), Err(TxHashError::InvalidLength));
    }

    #[test]
    fn validate_rejects_too_long() {
        // 65 hex chars — one extra.
        let long = format!("{}0", VALID_LOWER);
        assert_eq!(validate_tx_hash(&long), Err(TxHashError::InvalidLength));
    }

    #[test]
    fn validate_rejects_single_char() {
        assert_eq!(validate_tx_hash("a"), Err(TxHashError::InvalidLength));
    }

    #[test]
    fn validate_rejects_whitespace_padded() {
        // Leading whitespace: total length is 66 but semantic content is wrong.
        let padded = format!(" {}", VALID_LOWER);
        assert_eq!(validate_tx_hash(&padded), Err(TxHashError::InvalidLength));
    }

    // -----------------------------------------------------------------------
    // validate_tx_hash — character violations
    // -----------------------------------------------------------------------

    #[test]
    fn validate_rejects_lowercase_g() {
        // Position 63: replace '9' with 'g' (outside hex, lowercase).
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[63] = 'g';
        let bad: String = chars.into_iter().collect();
        assert_eq!(validate_tx_hash(&bad), Err(TxHashError::InvalidCharacter));
    }

    #[test]
    fn validate_rejects_uppercase_z() {
        // 'Z' is outside the hex character set (0-9, a-f, A-F).
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[0] = 'Z';
        let bad: String = chars.into_iter().collect();
        assert_eq!(validate_tx_hash(&bad), Err(TxHashError::InvalidCharacter));
    }

    #[test]
    fn validate_rejects_special_characters() {
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[30] = '!';
        let bad: String = chars.into_iter().collect();
        assert_eq!(validate_tx_hash(&bad), Err(TxHashError::InvalidCharacter));
    }

    #[test]
    fn validate_rejects_whitespace_inside() {
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[31] = ' ';
        let bad: String = chars.into_iter().collect();
        assert_eq!(validate_tx_hash(&bad), Err(TxHashError::InvalidCharacter));
    }

    #[test]
    fn validate_rejects_hyphen_inside() {
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[32] = '-';
        let bad: String = chars.into_iter().collect();
        assert_eq!(validate_tx_hash(&bad), Err(TxHashError::InvalidCharacter));
    }

    #[test]
    fn validate_rejects_unicode_characters() {
        // 'é' (U+00E9) is 2 bytes in UTF-8, so the total byte length
        // becomes 65, which fails the length check before any character
        // validation runs.
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[0] = 'é';
        let bad: String = chars.into_iter().collect();
        assert_eq!(validate_tx_hash(&bad), Err(TxHashError::InvalidLength));
    }

    // -----------------------------------------------------------------------
    // is_valid_tx_hash — convenience wrapper
    // -----------------------------------------------------------------------

    #[test]
    fn is_valid_returns_true_for_valid_hash() {
        assert!(is_valid_tx_hash(VALID_LOWER));
        assert!(is_valid_tx_hash(VALID_UPPER));
    }

    #[test]
    fn is_valid_returns_false_for_empty_string() {
        assert!(!is_valid_tx_hash(""));
    }

    #[test]
    fn is_valid_returns_false_for_short_string() {
        assert!(!is_valid_tx_hash("abc"));
    }

    #[test]
    fn is_valid_returns_false_for_invalid_char() {
        let mut chars: Vec<char> = VALID_LOWER.chars().collect();
        chars[40] = 'x';
        let bad: String = chars.into_iter().collect();
        assert!(!is_valid_tx_hash(&bad));
    }

    // -----------------------------------------------------------------------
    // Constant sanity
    // -----------------------------------------------------------------------

    #[test]
    fn tx_hash_hex_len_is_64() {
        assert_eq!(TX_HASH_HEX_LEN, 64);
    }

    #[test]
    fn valid_test_vectors_are_correct_length() {
        assert_eq!(VALID_LOWER.len(), TX_HASH_HEX_LEN);
        assert_eq!(VALID_UPPER.len(), TX_HASH_HEX_LEN);
        assert_eq!(VALID_MIXED.len(), TX_HASH_HEX_LEN);
        assert_eq!(VALID_DIGITS_ONLY.len(), TX_HASH_HEX_LEN);
    }
}
