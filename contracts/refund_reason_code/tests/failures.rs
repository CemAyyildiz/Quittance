//! Failure and error-case tests for `refund-reason-code`.
//!
//! The contract has exactly one way to refuse a call: the refund id already
//! carries a reason. These tests pin that refusal, its error code, and the
//! guarantee that a refused call writes nothing.

mod common;

use common::{refund_id, setup};
use refund_reason_code::{Error, ReasonCode};

#[test]
fn recording_twice_is_rejected() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_twice");

    client.record_reason(&refund, &ReasonCode::Other);

    assert_eq!(
        client.try_record_reason(&refund, &ReasonCode::Other),
        Err(Ok(Error::AlreadyRecorded))
    );
}

#[test]
fn a_rejected_record_leaves_the_stored_reason_untouched() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_keep");

    client.record_reason(&refund, &ReasonCode::CustomerRequest);
    let _ = client.try_record_reason(&refund, &ReasonCode::Fraudulent);

    assert_eq!(
        client.reason_for(&refund),
        Some(ReasonCode::CustomerRequest)
    );
}

#[test]
fn reading_an_unknown_refund_id_returns_none() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_unknown");

    assert_eq!(client.reason_for(&refund), None);
}

#[test]
fn a_fresh_contract_returns_none_for_every_id() {
    let (env, client) = setup();

    // A never-used contract still answers reads, for any id.
    for name in ["refund_x", "refund_y", "refund_z"] {
        let refund = refund_id(&env, name);
        assert_eq!(client.reason_for(&refund), None);
    }
}

#[test]
fn the_error_code_and_message_are_stable() {
    assert_eq!(Error::AlreadyRecorded as u32, 1);
    assert_eq!(
        Error::AlreadyRecorded.message(),
        "A reason is already recorded for this refund id."
    );
}
