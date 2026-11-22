//! Happy-path tests for `refund-reason-code`.
//!
//! These cover the successful path: a reason is recorded for a refund id and
//! read back unchanged.

mod common;

use common::{refund_id, setup, ALL_REASONS};
use refund_reason_code::{ReasonCode, RefundReasonCode, RefundReasonCodeClient};
use soroban_sdk::Env;

#[test]
fn a_reason_is_recorded_and_read_back() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_1");

    assert_eq!(client.reason_for(&refund), None);

    client.record_reason(&refund, &ReasonCode::CustomerRequest);

    assert_eq!(
        client.reason_for(&refund),
        Some(ReasonCode::CustomerRequest)
    );
}

#[test]
fn every_reason_code_round_trips() {
    let (env, client) = setup();

    for (index, reason) in ALL_REASONS.iter().enumerate() {
        let name = format!("refund_{index}");
        let refund = refund_id(&env, &name);

        client.record_reason(&refund, reason);
        assert_eq!(client.reason_for(&refund), Some(*reason));
    }
}

#[test]
fn reading_a_reason_does_not_consume_it() {
    let (env, client) = setup();
    let refund = refund_id(&env, "refund_read");

    client.record_reason(&refund, &ReasonCode::ServiceNotDelivered);

    for _ in 0..3 {
        assert_eq!(
            client.reason_for(&refund),
            Some(ReasonCode::ServiceNotDelivered)
        );
    }
}

#[test]
fn different_refund_ids_keep_their_own_reason() {
    let (env, client) = setup();
    let first = refund_id(&env, "refund_a");
    let second = refund_id(&env, "refund_b");

    client.record_reason(&first, &ReasonCode::DuplicateCharge);
    client.record_reason(&second, &ReasonCode::Fraudulent);

    assert_eq!(client.reason_for(&first), Some(ReasonCode::DuplicateCharge));
    assert_eq!(client.reason_for(&second), Some(ReasonCode::Fraudulent));
}

#[test]
fn a_second_client_reads_the_same_record() {
    let env = Env::default();
    let contract_id = env.register(RefundReasonCode, ());
    let writer = RefundReasonCodeClient::new(&env, &contract_id);
    let reader = RefundReasonCodeClient::new(&env, &contract_id);
    let refund = refund_id(&env, "refund_shared");

    writer.record_reason(&refund, &ReasonCode::Other);

    assert_eq!(reader.reason_for(&refund), Some(ReasonCode::Other));
}
