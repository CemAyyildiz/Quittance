//! Asset code allowlist for the Quittance MVP.
//!
//! Restricts the set of allowed Stellar asset codes to `XLM` and `USDC`.
//! All comparisons are case-sensitive and require an exact match against
//! the canonical asset code. No issuer validation, trustline checks, or
//! network calls are performed here; this helper only decides whether a
//! given asset code is in the allowlist.

/// Single source of truth for the asset codes allowed in the Quittance MVP.
///
/// - `"XLM"` — the native Stellar asset.
/// - `"USDC"` — the Stellar USDC issuance on the relevant network.
///
/// This slice is the canonical allowlist. `is_allowed_asset_code` and any
/// other consumer must derive their behavior from it rather than hard-coding
/// codes. Issuer validation and trustline checks are explicitly out of scope.
pub const ALLOWED_ASSET_CODES: &[&str] = &["XLM", "USDC"];

/// Returns `true` if `asset_code` is an allowed Stellar asset code for the
/// Quittance MVP; otherwise `false`.
///
/// The match is case-sensitive and requires an exact match against one of the
/// canonical asset codes in [`ALLOWED_ASSET_CODES`].
///
/// Whitespace, alternate casing, empty strings, and any other code return
/// `false`. Issuer validation and trustline checks are explicitly out of
/// scope for this helper.
pub fn is_allowed_asset_code(asset_code: &str) -> bool {
    ALLOWED_ASSET_CODES.contains(&asset_code)
}

#[cfg(test)]
mod tests {
    use super::is_allowed_asset_code;

    #[test]
    fn allows_canonical_xlm_and_usdc() {
        assert!(is_allowed_asset_code("XLM"));
        assert!(is_allowed_asset_code("USDC"));
    }

    #[test]
    fn allowed_asset_codes_is_xlm_and_usdc_only() {
        assert_eq!(ALLOWED_ASSET_CODES, &["XLM", "USDC"][..]);
    }

    #[test]
    fn is_allowed_asset_code_is_derived_from_allowlist() {
        for code in ALLOWED_ASSET_CODES {
            assert!(is_allowed_asset_code(code));
        }
    }

    #[test]
    fn is_case_sensitive() {
        assert!(!is_allowed_asset_code("xlm"));
        assert!(!is_allowed_asset_code("usdc"));
        assert!(!is_allowed_asset_code("Xlm"));
        assert!(!is_allowed_asset_code("Usdc"));
        assert!(!is_allowed_asset_code("uSDC"));
    }

    #[test]
    fn rejects_empty_string() {
        assert!(!is_allowed_asset_code(""));
    }

    #[test]
    fn rejects_whitespace() {
        assert!(!is_allowed_asset_code(" XLM"));
        assert!(!is_allowed_asset_code("XLM "));
        assert!(!is_allowed_asset_code("  USDC  "));
        assert!(!is_allowed_asset_code("\tXLM"));
        assert!(!is_allowed_asset_code("USDC\n"));
        assert!(!is_allowed_asset_code("X LM"));
        assert!(!is_allowed_asset_code("US DC"));
    }

    #[test]
    fn rejects_lookalike_and_unrelated_codes() {
        // Other stablecoins or partial forms must not be accepted.
        assert!(!is_allowed_asset_code("USD"));
        assert!(!is_allowed_asset_code("USDT"));
        assert!(!is_allowed_asset_code("WXT"));
        assert!(!is_allowed_asset_code("BTC"));
        assert!(!is_allowed_asset_code("ETH"));
        // Extra characters appended to valid codes.
        assert!(!is_allowed_asset_code("XLMM"));
        assert!(!is_allowed_asset_code("USDCC"));
        // Composite / dash codes.
        assert!(!is_allowed_asset_code("BTC-USD"));
        // Keyboard neighbours / drop-one-character variants.
        assert!(!is_allowed_asset_code("XML"));
        assert!(!is_allowed_asset_code("XL"));
        assert!(!is_allowed_asset_code("USDD"));
    }

    #[test]
    fn rejects_unicode_homoglyphs() {
        // Cyrillic Х (U+0425) before "LM" looks like "XLM" but is multi-byte
        // UTF-8 and must not pass.
        assert!(!is_allowed_asset_code("\u{0425}LM"));
        // Cyrillic М (U+041C) substituting the trailing "M" of "XLM".
        assert!(!is_allowed_asset_code("XL\u{041C}"));
        // Cyrillic С (U+0421) substituting the leading "S" of "USDC".
        assert!(!is_allowed_asset_code("\u{0421}UDC"));
        // Greek capital Mu (U+039C) substituting the trailing "M".
        assert!(!is_allowed_asset_code("XL\u{039C}"));
    }

    #[test]
    fn exhaustive_truth_table() {
        let cases: &[(&str, bool)] = &[
            ("XLM", true),
            ("USDC", true),
            ("", false),
            ("xlm", false),
            ("usdc", false),
            ("XLM ", false),
            (" XLM", false),
            ("USD", false),
            ("USDT", false),
            ("XML", false),
            ("XL", false),
            ("USDD", false),
            ("USDCC", false),
            ("XLMM", false),
            ("USDC\n", false),
        ];
        for (code, expected) in cases {
            assert_eq!(
                is_allowed_asset_code(code),
                *expected,
                "is_allowed_asset_code({:?}) should be {}",
                code,
                expected
            );
        }
    }
}
