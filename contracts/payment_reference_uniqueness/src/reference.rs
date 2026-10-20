//! Pure helpers for validating payment reference strings.
//!
//! References are stored as Soroban `Symbol`s, which only accept the
//! characters `a-z`, `A-Z`, `0-9`, and `_`, and at most 32 characters. These
//! helpers let off-chain code reject an unusable reference *before* it
//! reaches the contract, instead of discovering the problem as a host error.

/// Maximum number of characters a Soroban symbol can hold.
pub const MAX_REFERENCE_LEN: usize = 32;

/// Return `true` when every byte of `reference` is allowed in a Soroban
/// symbol.
///
/// The allowed alphabet is `a-z`, `A-Z`, `0-9`, and `_`. Everything else —
/// including `-`, `.`, spaces, and non-ASCII bytes — is rejected.
#[must_use]
pub fn has_valid_charset(reference: &str) -> bool {
    reference
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

/// Return `true` when `reference` can be represented as a Soroban symbol.
///
/// A reference is usable when it is at most [`MAX_REFERENCE_LEN`] characters
/// long and uses only the allowed charset. The empty string is a valid (if
/// unusual) reference.
#[must_use]
pub fn is_valid_reference(reference: &str) -> bool {
    reference.len() <= MAX_REFERENCE_LEN && has_valid_charset(reference)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordinary_references_are_valid() {
        assert!(is_valid_reference("INV_1"));
        assert!(is_valid_reference("PAY_2026_0003"));
        assert!(is_valid_reference("inv1"));
    }

    #[test]
    fn an_empty_reference_is_valid() {
        assert!(is_valid_reference(""));
    }

    #[test]
    fn a_reference_at_the_length_limit_is_valid() {
        assert!(is_valid_reference(&"a".repeat(MAX_REFERENCE_LEN)));
    }

    #[test]
    fn a_reference_past_the_length_limit_is_invalid() {
        assert!(!is_valid_reference(&"a".repeat(MAX_REFERENCE_LEN + 1)));
    }

    #[test]
    fn punctuation_is_rejected() {
        assert!(!has_valid_charset("INV-1"));
        assert!(!has_valid_charset("INV 1"));
        assert!(!has_valid_charset("INV.1"));
        assert!(!is_valid_reference("INV-1"));
    }

    #[test]
    fn non_ascii_bytes_are_rejected() {
        assert!(!has_valid_charset("INV\u{00e9}"));
        assert!(!is_valid_reference("INV\u{00e9}"));
    }
}
