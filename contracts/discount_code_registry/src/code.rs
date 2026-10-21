//! Shape checks for a discount code.

use crate::error::DiscountError;

/// Maximum number of characters in a discount code.
pub const MAX_CODE_LEN: usize = 32;

/// Checks that `code` is a non-empty `[A-Z0-9]` string of at most [`MAX_CODE_LEN`] characters.
///
/// Checks run in this order: empty, length, charset. A string that is both
/// too long and outside the charset returns [`DiscountError::CodeTooLong`].
///
/// # Errors
///
/// - [`DiscountError::EmptyCode`] when `code` is empty.
/// - [`DiscountError::CodeTooLong`] when `code` is longer than [`MAX_CODE_LEN`].
/// - [`DiscountError::InvalidCharset`] when any character is outside `A-Z` and `0-9`.
pub fn validate_code(code: &str) -> Result<(), DiscountError> {
    if code.is_empty() {
        return Err(DiscountError::EmptyCode);
    }
    if code.chars().count() > MAX_CODE_LEN {
        return Err(DiscountError::CodeTooLong);
    }
    if !code.chars().all(is_code_char) {
        return Err(DiscountError::InvalidCharset);
    }
    Ok(())
}

fn is_code_char(ch: char) -> bool {
    ch.is_ascii_uppercase() || ch.is_ascii_digit()
}
