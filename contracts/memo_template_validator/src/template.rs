//! The `INV-<digits>` template and its validator.

/// The required literal prefix for a valid invoice memo.
pub const INVOICE_MEMO_PREFIX: &str = "INV-";

/// Returns `true` when `memo` is exactly `INV-` followed by one or more
/// ASCII digits and nothing else.
///
/// - The prefix is case-sensitive: `inv-1` and `Inv-1` are rejected.
/// - At least one digit is required: `INV-` alone is rejected.
/// - Any non-digit after the prefix (including whitespace, a sign, a
///   decimal point, or a non-ASCII digit) is rejected.
///
/// ```
/// use memo_template_validator::is_valid_memo;
///
/// assert!(is_valid_memo("INV-1"));
/// assert!(is_valid_memo("INV-000042"));
/// assert!(!is_valid_memo("INV-"));
/// assert!(!is_valid_memo("inv-1"));
/// ```
pub fn is_valid_memo(memo: &str) -> bool {
    match memo.strip_prefix(INVOICE_MEMO_PREFIX) {
        Some(digits) => !digits.is_empty() && digits.bytes().all(|b| b.is_ascii_digit()),
        None => false,
    }
}
