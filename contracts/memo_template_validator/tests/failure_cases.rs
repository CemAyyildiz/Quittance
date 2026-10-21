//! Failure cases: malformed memos must be rejected, not panic.

use memo_template_validator::is_valid_memo;

#[test]
fn rejects_a_lowercase_prefix() {
    assert!(!is_valid_memo("inv-1"));
}

#[test]
fn rejects_a_non_digit_suffix() {
    assert!(!is_valid_memo("INV-abc"));
}

#[test]
fn rejects_a_decimal_amount() {
    assert!(!is_valid_memo("INV-1.5"));
}

#[test]
fn rejects_a_negative_sign() {
    assert!(!is_valid_memo("INV--1"));
}

#[test]
fn rejects_trailing_whitespace() {
    assert!(!is_valid_memo("INV-1 "));
}

#[test]
fn rejects_leading_whitespace() {
    assert!(!is_valid_memo(" INV-1"));
}
