//! Happy-path cases: well-formed `INV-<digits>` memos are accepted.

use memo_template_validator::is_valid_memo;

#[test]
fn accepts_a_single_digit_invoice() {
    assert!(is_valid_memo("INV-1"));
}

#[test]
fn accepts_a_multi_digit_invoice() {
    assert!(is_valid_memo("INV-20260421"));
}

#[test]
fn accepts_a_memo_with_leading_zeros() {
    assert!(is_valid_memo("INV-000123"));
}
