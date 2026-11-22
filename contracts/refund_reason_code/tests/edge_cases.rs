//! Edge and boundary tests for `refund-reason-code`.
//!
//! These push the identifiers and the fixed enum to their limits: the shortest
//! and longest refund ids a `Symbol` can carry, ids that differ by one
//! character, and every reason code stored side by side.

mod common;

use common::{refund_id, setup, ALL_REASONS};
use refund_reason_code::ReasonCode;

#[test]
fn a_single_character_refund_id_works() {
    let (env, client) = setup();
    let refund = refund_id(&env, "r");

    client.record_reason(&refund, &ReasonCode::Other);

    assert_eq!(client.reason_for(&refund), Some(ReasonCode::Other));
}

#[test]
fn the_longest_supported_refund_id_works() {
    let (env, client) = setup();
    // Exactly 32 characters, the maximum length of a Soroban `Symbol`.
    let longest = "refund_0123456789abcdefghijklmno";
    assert_eq!(longest.len(), 32);
    let refund = refund_id(&env, longest);

    client.record_reason(&refund, &ReasonCode::DuplicateCharge);

    assert_eq!(
        client.reason_for(&refund),
        Some(ReasonCode::DuplicateCharge)
    );
}

#[test]
fn ids_that_differ_by_one_character_are_independent() {
    let (env, client) = setup();
    let first = refund_id(&env, "refund_abc");
    let second = refund_id(&env, "refund_abd");

    client.record_reason(&first, &ReasonCode::CustomerRequest);
    client.record_reason(&second, &ReasonCode::Fraudulent);

    assert_eq!(client.reason_for(&first), Some(ReasonCode::CustomerRequest));
    assert_eq!(client.reason_for(&second), Some(ReasonCode::Fraudulent));
}

#[test]
fn every_reason_code_is_stored_alongside_the_others() {
    let (env, client) = setup();
    let ids = [
        refund_id(&env, "refund_0"),
        refund_id(&env, "refund_1"),
        refund_id(&env, "refund_2"),
        refund_id(&env, "refund_3"),
        refund_id(&env, "refund_4"),
    ];

    for (index, reason) in ALL_REASONS.iter().enumerate() {
        client.record_reason(&ids[index], reason);
    }

    for (index, reason) in ALL_REASONS.iter().enumerate() {
        assert_eq!(client.reason_for(&ids[index]), Some(*reason));
    }
}

#[test]
fn an_unrecorded_id_still_returns_none_after_other_ids_are_recorded() {
    let (env, client) = setup();
    let recorded = refund_id(&env, "refund_recorded");
    let untouched = refund_id(&env, "refund_untouched");

    client.record_reason(&recorded, &ReasonCode::Other);

    assert_eq!(client.reason_for(&recorded), Some(ReasonCode::Other));
    assert_eq!(client.reason_for(&untouched), None);
}
