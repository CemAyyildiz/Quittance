//! Boundary cases: length edges, digit extremes, checksum range.

use invoice_id_format_validator::{
    checksum_digit, checksum_suffix, is_valid_invoice_id, BODY_LEN, CHECKSUM_LEN, ID_LEN, PREFIX,
};

#[test]
fn convention_constants_are_consistent() {
    assert_eq!(PREFIX, "INV");
    assert_eq!(PREFIX.len(), 3);
    assert_eq!(BODY_LEN, 10);
    assert_eq!(CHECKSUM_LEN, 2);
    assert_eq!(ID_LEN, PREFIX.len() + BODY_LEN + CHECKSUM_LEN);
    assert_eq!(ID_LEN, 15);
}

#[test]
fn checksum_always_fits_two_digits() {
    // The mod-97 reduction yields 0..=96, which always fits in two digits.
    for body in ["0", "9", "96", "97", "98", "9999999999"] {
        let value = checksum_digit(body).expect("digits are valid");
        assert!(value < 97);
    }
}

#[test]
fn checksum_of_empty_digit_string_is_zero() {
    assert_eq!(checksum_digit(""), Some(0));
}

#[test]
fn length_boundaries_are_rejected() {
    let valid = "INV000000000101"; // 15 bytes
    assert!(is_valid_invoice_id(valid));
    // 14 and 16 bytes: off by one in either direction.
    assert!(!is_valid_invoice_id("INV00000000101"));
    assert!(!is_valid_invoice_id("INV0000000001010"));
    // Empty and one-byte strings.
    assert!(!is_valid_invoice_id(""));
    assert!(!is_valid_invoice_id("I"));
}

#[test]
fn digit_extremes_checksum_and_verify() {
    // Smallest and largest 10-digit bodies round-trip through the checksum.
    for body in ["0000000000", "9999999999"] {
        let suffix = checksum_suffix(body).expect("digits are valid");
        let suffix = core::str::from_utf8(&suffix).unwrap();
        let id = format!("INV{body}{suffix}");
        assert!(is_valid_invoice_id(&id));
    }
}

#[test]
fn checksum_suffix_is_zero_padded() {
    // Body value 1 -> checksum 1 -> must pad to "01", not "1".
    let suffix = checksum_suffix("0000000001").unwrap();
    assert_eq!(&suffix, b"01");
}
