//! Asset-code validation for the per-seller currency allowlist.
//!
//! Only syntactic validation is performed here: issuer checks, trustline
//! checks, and network calls are explicitly out of scope for this
//! standalone primitive.

use crate::types::AllowlistError;

/// Longest valid Stellar asset code, in characters.
///
/// Stellar asset codes are 1–12 characters long (`XLM`, `USDC`, …), so a
/// 13-character code can never appear on any invoice.
pub const MAX_ASSET_CODE_LEN: usize = 12;

/// Validate `code` as a Stellar asset code.
///
/// A valid code is 1–[`MAX_ASSET_CODE_LEN`] (12) **ASCII alphanumeric**
/// characters. Empty codes, over-long codes, and codes containing spaces,
/// punctuation, underscores, or any non-ASCII character are rejected with
/// [`AllowlistError::InvalidAssetCode`].
///
/// # Examples
///
/// ```
/// use seller_currency_allowlist::validate_asset_code;
///
/// assert!(validate_asset_code("XLM").is_ok());
/// assert!(validate_asset_code("ABCDEFGH1234").is_ok()); // 12 chars
/// assert!(validate_asset_code("").is_err());             // empty
/// assert!(validate_asset_code("TOOLONGCODE12").is_err()); // 13 chars
/// assert!(validate_asset_code("US-DC").is_err());        // punctuation
/// ```
pub fn validate_asset_code(code: &str) -> Result<(), AllowlistError> {
    let bytes = code.as_bytes();
    if bytes.is_empty() || bytes.len() > MAX_ASSET_CODE_LEN {
        return Err(AllowlistError::InvalidAssetCode);
    }
    if !bytes.iter().all(u8::is_ascii_alphanumeric) {
        return Err(AllowlistError::InvalidAssetCode);
    }
    Ok(())
}
