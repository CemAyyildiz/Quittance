//! Additional scenario: non-ASCII "digit" characters must not be accepted
//! as digits, since a byte-wise on-chain comparison needs the memo to be
//! plain ASCII.

use memo_template_validator::is_valid_memo;

#[test]
fn rejects_fullwidth_digits() {
    // U+FF11 FULLWIDTH DIGIT ONE - `char::is_numeric()` would accept this,
    // but it is not an ASCII digit.
    assert!(!is_valid_memo("INV-\u{FF11}"));
}

#[test]
fn rejects_arabic_indic_digits() {
    // U+0661 ARABIC-INDIC DIGIT ONE
    assert!(!is_valid_memo("INV-\u{0661}"));
}

#[test]
fn rejects_a_mix_of_ascii_and_non_ascii_digits() {
    assert!(!is_valid_memo("INV-1\u{FF12}"));
}
