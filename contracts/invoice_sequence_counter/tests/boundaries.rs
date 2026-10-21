//! Boundaries: zero, the top of `u64`, and seller-id shape.

use invoice_sequence_counter::{InvoiceSequenceCounter, SequenceVerdict};

const SELLER: &str = "GSELLER";

#[test]
fn nothing_issued_accepts_only_one() {
    let counter = InvoiceSequenceCounter::new();
    assert!(!counter.is_valid_seq(SELLER, 0).unwrap());
    assert!(counter.is_valid_seq(SELLER, 1).unwrap());
    assert!(!counter.is_valid_seq(SELLER, 2).unwrap());
    assert!(!counter.is_valid_seq(SELLER, u64::MAX).unwrap());
    assert_eq!(
        counter.classify(SELLER, 0).unwrap(),
        SequenceVerdict::OutOfOrder
    );
    assert_eq!(
        counter.classify(SELLER, u64::MAX).unwrap(),
        SequenceVerdict::OutOfOrder
    );
}

#[test]
fn single_character_seller_is_its_own_counter() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq("a").unwrap(), 1);
    assert_eq!(counter.next_seq("b").unwrap(), 1);
    assert_eq!(counter.next_seq("a").unwrap(), 2);
}

#[test]
fn whitespace_and_case_are_distinct_sellers() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq("seller").unwrap(), 1);
    assert_eq!(counter.next_seq("Seller").unwrap(), 1);
    assert_eq!(counter.next_seq(" seller").unwrap(), 1);
    assert_eq!(counter.next_seq("seller ").unwrap(), 1);
    assert_eq!(counter.next_seq(" ").unwrap(), 1);
    assert_eq!(counter.next_seq("seller").unwrap(), 2);
}

#[test]
fn unicode_seller_id_is_preserved_byte_for_byte() {
    let mut counter = InvoiceSequenceCounter::new();
    let seller = "satıcı-1";
    assert_eq!(counter.next_seq(seller).unwrap(), 1);
    assert!(counter.is_valid_seq(seller, 2).unwrap());
    assert!(!counter.is_valid_seq("satici-1", 2).unwrap());
}

#[test]
fn long_seller_id_still_starts_at_one() {
    let seller = "G".repeat(4_096);
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq(&seller).unwrap(), 1);
    assert_eq!(counter.next_seq(&seller).unwrap(), 2);
    assert_eq!(counter.last_issued(&seller).unwrap(), Some(2));
}

#[test]
fn a_thousand_issues_stay_contiguous() {
    let mut counter = InvoiceSequenceCounter::new();
    for expected in 1..=1_000 {
        assert!(counter.is_valid_seq(SELLER, expected).unwrap());
        assert!(!counter.is_valid_seq(SELLER, expected + 1).unwrap());
        assert_eq!(counter.next_seq(SELLER).unwrap(), expected);
    }
    assert_eq!(counter.last_issued(SELLER).unwrap(), Some(1_000));
    assert_eq!(counter.expected_seq(SELLER).unwrap(), Some(1_001));
}
