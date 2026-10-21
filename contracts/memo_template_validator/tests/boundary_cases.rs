//! Boundary cases around the shortest valid memo and the prefix edge.

use memo_template_validator::is_valid_memo;

#[test]
fn rejects_the_prefix_alone_with_no_digits() {
    assert!(!is_valid_memo("INV-"));
}

#[test]
fn rejects_a_memo_one_character_short_of_the_prefix() {
    assert!(!is_valid_memo("INV"));
}

#[test]
fn accepts_the_shortest_possible_valid_memo() {
    assert!(is_valid_memo("INV-0"));
}

#[test]
fn rejects_an_empty_memo() {
    assert!(!is_valid_memo(""));
}
