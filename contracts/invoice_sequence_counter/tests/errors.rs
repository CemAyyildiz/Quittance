//! Failures: empty sellers are rejected and do not change state.

use std::error::Error;

use invoice_sequence_counter::{InvoiceSequenceCounter, SellerId, SequenceError};

const SELLER: &str = "GSELLER";

#[test]
fn empty_seller_is_rejected_by_every_entry_point() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq(""), Err(SequenceError::EmptySeller));
    assert_eq!(counter.is_valid_seq("", 1), Err(SequenceError::EmptySeller));
    assert_eq!(counter.classify("", 1), Err(SequenceError::EmptySeller));
    assert_eq!(counter.expected_seq(""), Err(SequenceError::EmptySeller));
    assert_eq!(counter.last_issued(""), Err(SequenceError::EmptySeller));
}

#[test]
fn rejected_next_seq_does_not_consume_a_number() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(counter.next_seq(""), Err(SequenceError::EmptySeller));
    assert_eq!(counter.next_seq(SELLER).unwrap(), 1);
    assert_eq!(counter.next_seq(""), Err(SequenceError::EmptySeller));
    assert_eq!(counter.next_seq(SELLER).unwrap(), 2);
}

#[test]
fn seller_id_parse_rejects_only_the_empty_string() {
    assert_eq!(SellerId::parse(""), Err(SequenceError::EmptySeller));
    let parsed = SellerId::parse("G").unwrap();
    assert_eq!(parsed.as_str(), "G");
    assert_eq!(parsed.as_ref(), "G");
    assert_eq!(parsed.to_string(), "G");
    assert_eq!(SellerId::parse("G").unwrap().into_string(), "G");
}

#[test]
fn empty_seller_error_is_a_stable_std_error() {
    let err = SequenceError::EmptySeller;
    assert_eq!(err as u32, 1);
    assert_eq!(err.message(), "Seller id is empty.");
    assert_eq!(err.to_string(), "Seller id is empty.");
    let as_error: &dyn Error = &err;
    assert!(as_error.source().is_none());

    let saturated = SequenceError::Saturated;
    assert_eq!(saturated as u32, 2);
    assert_eq!(
        saturated.to_string(),
        "Invoice sequence is saturated at u64::MAX."
    );
}
