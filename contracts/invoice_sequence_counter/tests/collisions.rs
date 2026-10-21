//! Collisions and out-of-order submissions.

use invoice_sequence_counter::{InvoiceSequenceCounter, SequenceVerdict};

const SELLER: &str = "GSELLER";
const OTHER: &str = "GOTHER";

fn issued(n: u64) -> InvoiceSequenceCounter {
    let mut counter = InvoiceSequenceCounter::new();
    for _ in 0..n {
        counter.next_seq(SELLER).unwrap();
    }
    counter
}

#[test]
fn replaying_the_latest_number_is_a_collision() {
    let counter = issued(3);
    assert!(!counter.is_valid_seq(SELLER, 3).unwrap());
    assert_eq!(
        counter.classify(SELLER, 3).unwrap(),
        SequenceVerdict::Collision
    );
}

#[test]
fn replaying_an_earlier_number_is_a_collision() {
    let counter = issued(5);
    for candidate in [1_u64, 2, 4] {
        assert!(!counter.is_valid_seq(SELLER, candidate).unwrap());
        assert_eq!(
            counter.classify(SELLER, candidate).unwrap(),
            SequenceVerdict::Collision
        );
    }
}

#[test]
fn skipping_ahead_is_out_of_order() {
    let counter = issued(5);
    assert!(counter.is_valid_seq(SELLER, 6).unwrap());
    assert!(!counter.is_valid_seq(SELLER, 7).unwrap());
    assert!(!counter.is_valid_seq(SELLER, 100).unwrap());
    assert_eq!(
        counter.classify(SELLER, 7).unwrap(),
        SequenceVerdict::OutOfOrder
    );
    assert_eq!(
        counter.classify(SELLER, u64::MAX).unwrap(),
        SequenceVerdict::OutOfOrder
    );
}

#[test]
fn zero_is_out_of_order_after_numbers_have_been_issued() {
    let counter = issued(1);
    assert!(!counter.is_valid_seq(SELLER, 0).unwrap());
    assert_eq!(
        counter.classify(SELLER, 0).unwrap(),
        SequenceVerdict::OutOfOrder
    );
}

#[test]
fn the_same_number_on_another_seller_is_not_a_collision() {
    let mut counter = issued(4);
    assert!(counter.is_valid_seq(OTHER, 1).unwrap());
    assert_eq!(counter.next_seq(OTHER).unwrap(), 1);
    assert_eq!(
        counter.classify(SELLER, 1).unwrap(),
        SequenceVerdict::Collision
    );
    assert_eq!(
        counter.classify(OTHER, 1).unwrap(),
        SequenceVerdict::Collision
    );
    assert_eq!(counter.classify(OTHER, 2).unwrap(), SequenceVerdict::Accept);
}

#[test]
fn issuing_the_expected_number_turns_it_into_a_collision() {
    let mut counter = InvoiceSequenceCounter::new();
    assert_eq!(
        counter.classify(SELLER, 1).unwrap(),
        SequenceVerdict::Accept
    );
    assert_eq!(counter.next_seq(SELLER).unwrap(), 1);
    assert_eq!(
        counter.classify(SELLER, 1).unwrap(),
        SequenceVerdict::Collision
    );
    assert_eq!(
        counter.classify(SELLER, 2).unwrap(),
        SequenceVerdict::Accept
    );
    assert_eq!(counter.last_issued(SELLER).unwrap(), Some(1));
}
