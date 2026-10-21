//! Happy path: each seller receives 1, then 2, then 3, independently.

use invoice_sequence_counter::{InvoiceSequenceCounter, SequenceVerdict, FIRST_SEQUENCE};

const SELLER_A: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const SELLER_B: &str = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBV";

#[test]
fn first_call_issues_one() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), FIRST_SEQUENCE);
    assert_eq!(counter.last_issued(SELLER_A).unwrap(), Some(1));
    assert_eq!(counter.expected_seq(SELLER_A).unwrap(), Some(2));
}

#[test]
fn later_calls_increase_by_one() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 1);
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 2);
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 3);
    assert_eq!(counter.last_issued(SELLER_A).unwrap(), Some(3));
}

#[test]
fn sellers_do_not_share_a_counter() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 1);
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 2);
    assert_eq!(counter.next_seq(SELLER_B).unwrap(), 1);
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 3);
    assert_eq!(counter.last_issued(SELLER_B).unwrap(), Some(1));
}

#[test]
fn valid_candidate_is_the_number_next_seq_would_issue() {
    let mut counter = InvoiceSequenceCounter::new();
    assert!(counter.is_valid_seq(SELLER_A, 1).unwrap());
    assert_eq!(
        counter.classify(SELLER_A, 1).unwrap(),
        SequenceVerdict::Accept
    );

    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 1);
    assert!(counter.is_valid_seq(SELLER_A, 2).unwrap());
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 2);
}

#[test]
fn is_valid_seq_does_not_advance_the_counter() {
    let mut counter = InvoiceSequenceCounter::new();
    assert!(counter.is_valid_seq(SELLER_A, 1).unwrap());
    assert!(counter.is_valid_seq(SELLER_A, 1).unwrap());
    assert_eq!(counter.last_issued(SELLER_A).unwrap(), None);
    assert_eq!(counter.next_seq(SELLER_A).unwrap(), 1);
}

#[test]
fn default_starts_empty_like_new() {
    let counter = InvoiceSequenceCounter::default();
    assert_eq!(counter.last_issued(SELLER_A).unwrap(), None);
    assert_eq!(counter.expected_seq(SELLER_A).unwrap(), Some(1));
}
