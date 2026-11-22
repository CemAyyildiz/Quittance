//! Happy path: well-formed ids validate and checksums verify.

use invoice_id_format_validator::{checksum_digit, is_valid_invoice_id};

#[test]
fn minimal_valid_id() {
    // Body 0000000001 -> value 1 -> mod 97 = 1 -> checksum "01".
    assert!(is_valid_invoice_id("INV000000000101"));
}

#[test]
fn all_zero_body_is_valid() {
    // Body 0000000000 -> value 0 -> checksum "00".
    assert!(is_valid_invoice_id("INV000000000000"));
}

#[test]
fn checksum_digit_matches_manual_reduction() {
    // 1234567890 mod 97 == 2, so the suffix must be "02".
    assert_eq!(checksum_digit("1234567890"), Some(2));
    assert!(is_valid_invoice_id("INV123456789002"));
}

#[test]
fn max_body_value_checksums_and_verifies() {
    // The largest 10-digit body round-trips through its own checksum.
    let expected = checksum_digit("9999999999").expect("digits are valid");
    let suffix = format!("{expected:02}");
    let id = format!("INV9999999999{suffix}");
    assert!(is_valid_invoice_id(&id));
}
