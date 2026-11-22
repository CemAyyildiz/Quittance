//! Immutability scenario tests for `refund-reason-code`.
//!
//! The point of this contract is that a recorded reason can only be read back.
//! These tests attack the record from every direction — a different reason, the
//! same reason again, repeated retries, a different refund id — and check that
//! the first recorded value survives all of it.

mod common;

use common::{refund_id, setup, ALL_REASONS};
use refund_reason_code::{Error, ReasonCode};

#[test]
fn a_recorded_reason_cannot_be_changed() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_locked");

    client.record_reason(&refund, &ReasonCode::DuplicateCharge);

    assert_eq!(
        client.try_record_reason(&refund, &ReasonCode::Fraudulent),
        Err(Ok(Error::AlreadyRecorded))
    );
    assert_eq!(
        client.reason_for(&refund),
        Some(ReasonCode::DuplicateCharge)
    );
}

#[test]
fn re_recording_the_same_reason_is_also_rejected() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_same");

    client.record_reason(&refund, &ReasonCode::Other);

    assert!(client
        .try_record_reason(&refund, &ReasonCode::Other)
        .is_err());
    assert_eq!(client.reason_for(&refund), Some(ReasonCode::Other));
}

#[test]
fn no_other_reason_in_the_set_can_replace_the_first() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_all");
    let first = ReasonCode::ServiceNotDelivered;

    client.record_reason(&refund, &first);

    for attempt in ALL_REASONS {
        assert!(client.try_record_reason(&refund, &attempt).is_err());
        assert_eq!(client.reason_for(&refund), Some(first));
    }
}

#[test]
fn repeated_retries_never_change_the_record() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_retry");

    client.record_reason(&refund, &ReasonCode::CustomerRequest);

    for _ in 0..5 {
        let _ = client.try_record_reason(&refund, &ReasonCode::Fraudulent);
    }

    assert_eq!(
        client.reason_for(&refund),
        Some(ReasonCode::CustomerRequest)
    );
}

#[test]
fn a_failed_change_on_one_refund_does_not_touch_another() {
    let (env, client) = setup();
    let locked = refund_id(&env, "refund_locked");
    let open = refund_id(&env, "refund_open");

    client.record_reason(&locked, &ReasonCode::DuplicateCharge);
    assert!(client
        .try_record_reason(&locked, &ReasonCode::Fraudulent)
        .is_err());

    // The rejected attempt did not leak onto another refund id.
    assert_eq!(client.reason_for(&open), None);
    client.record_reason(&open, &ReasonCode::Other);
    assert_eq!(client.reason_for(&open), Some(ReasonCode::Other));
}
