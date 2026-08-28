#![cfg(test)]

//! Unit tests for `event_invoice_created`.
//!
//! These tests build a Soroban `Env::default()` and assert against
//! the values returned by the helper functions.
//!
//! Notes on the SDK 22.0.0 typed surface that drive this file:
//!
//! * `soroban_sdk::Val` does **not** implement `PartialEq`, so any
//!   topic-vs-topic or topic-vs-expected assertion has to decode each
//!   `Val` into its known typed form (Symbol / String / Address)
//!   and compare typed values, not raw `Val`s.
//! * `env.events().all()` is gated behind the SDK `testutils`
//!   feature. `soroban-sdk v22.0.0` hard-pins
//!   `soroban-env-host = "=22.1.0"`, and env-host 22.1.0's
//!   `builtin_contracts::testutils::with_test_prng` lambda is
//!   uncompilable under the resolved `rand 0.8` /
//!   `ed25519-dalek 3.x` trait graph (an upstream
//!   `ChaCha20Rng: CryptoRng` trait-bound mismatch). We therefore
//!   do not enable `testutils` and these tests cover the **topic**
//!   and **data** builders only — not the full
//!   `env.events().publish(...) → .all()` round-trip.
//! * The crate is `#![no_std]`, so `alloc` is not in scope in the
//!   test module either; we avoid `Symbol::to_string` /
//!   the Soroban `String::to_string` calls entirely and instead
//!   compare against a fresh same-valued `Symbol`/`String` typed
//!   expectation.
//! * `Address::from_str` returns `Address` directly (no `Result`).
//! * `IntoVal` exposes a non-generic `into_val(&env) -> T` method;
//!   the target `T` is inferred from the binding.

use soroban_sdk::{Address, Env, IntoVal, String, Symbol, Val, Vec};

use crate::{data, topic, topics, EVENT_NAME};

// Valid Stellar account-id StrKeys, computed via CRC16-XMODEM
// over `0x30 || [payload; 32]` followed by Stellar-alphabet
// base32 encoding. They satisfy the StrKey checksum so
// `Address::from_str` accepts them.
//
// These are TEST FIXTURES — not real funded accounts.
//   A: payload [0x01; 32]
//   B: payload [0x02; 32]
//   C: payload [0xa1; 32]
const A_STRKEY: &str = "GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H";
const B_STRKEY: &str = "GABAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEJXA";
const C_STRKEY: &str = "GCQ2DINBUGQ2DINBUGQ2DINBUGQ2DINBUGQ2DINBUGQ2DINBUGQ2DJX7";

fn addr_seller(env: &Env) -> Address {
    Address::from_str(env, A_STRKEY)
}
fn addr_payer(env: &Env) -> Address {
    Address::from_str(env, B_STRKEY)
}
fn addr_asset(env: &Env) -> Address {
    Address::from_str(env, C_STRKEY)
}

/// Decode a `Vec<Val>` carrying the four-element `invoice_created`
/// topic vec into a typed 4-tuple for `PartialEq`-based assertions.
/// Works around `soroban_sdk::Val: !PartialEq`.
fn decode_topics(env: &Env, v: &Vec<Val>) -> (Symbol, String, Address, Address) {
    let s: Symbol = v.get(0).unwrap().into_val(env);
    let id: String = v.get(1).unwrap().into_val(env);
    let seller: Address = v.get(2).unwrap().into_val(env);
    let payer: Address = v.get(3).unwrap().into_val(env);
    (s, id, seller, payer)
}

#[test]
fn event_name_constant_is_invoice_created() {
    assert_eq!(EVENT_NAME, "invoice_created");
}

#[test]
fn topic_returns_symbol_matching_event_name() {
    let env = Env::default();

    let sym: Symbol = topic(&env);
    let expected: Symbol = Symbol::new(&env, "invoice_created");

    assert_eq!(sym, expected);
}

#[test]
fn topics_has_four_elements_in_canonical_order() {
    let env = Env::default();
    let seller = addr_seller(&env);
    let payer = addr_payer(&env);
    let invoice_id = String::from_str(&env, "inv-001");

    let t: Vec<Val> = topics(&env, &invoice_id, &seller, &payer);

    // Length is part of the public ABI.
    assert_eq!(t.len(), 4);

    // Decode each Val into its known typed form before comparing
    // (Val does not impl PartialEq).
    let expected_event: Symbol = Symbol::new(&env, "invoice_created");
    let expected_id: String = String::from_str(&env, "inv-001");
    let (t0, t1, t2, t3) = decode_topics(&env, &t);

    assert_eq!(t0, expected_event);
    assert_eq!(t1, expected_id);
    assert_eq!(t2, seller);
    assert_eq!(t3, payer);
}

#[test]
fn topics_distinguishes_seller_and_payer_order() {
    // Defensive: lock that swapping seller/payer changes the topic
    // vec observably, so a future refactor cannot silently swap them.
    let env = Env::default();
    let a: Address = addr_seller(&env);
    let b: Address = addr_payer(&env);
    let invoice_id = String::from_str(&env, "inv-swap");

    let t_ab = topics(&env, &invoice_id, &a, &b);
    let t_ba = topics(&env, &invoice_id, &b, &a);

    // Decode to typed Address values so we can compare.
    let seller_ab: Address = t_ab.get(2).unwrap().into_val(&env);
    let seller_ba: Address = t_ba.get(2).unwrap().into_val(&env);
    let payer_ab: Address = t_ab.get(3).unwrap().into_val(&env);
    let payer_ba: Address = t_ba.get(3).unwrap().into_val(&env);

    assert_ne!(
        seller_ab, seller_ba,
        "topic[2] should change when seller order changes"
    );
    assert_ne!(
        payer_ab, payer_ba,
        "topic[3] should change when payer order changes"
    );
}

#[test]
fn topics_distinguishes_invoice_id_against_two_distinct_inputs() {
    // Stronger than just `topics_has_four_elements_in_canonical_order`:
    // build two topics() calls with two distinct invoice ids and
    // confirm the topic[1] values differ as observed via the host.
    let env = Env::default();
    let seller = addr_seller(&env);
    let payer = addr_payer(&env);
    let id_a = String::from_str(&env, "inv-A");
    let id_b = String::from_str(&env, "inv-B");

    let t_a = topics(&env, &id_a, &seller, &payer);
    let t_b = topics(&env, &id_b, &seller, &payer);

    let topic_id_a: String = t_a.get(1).unwrap().into_val(&env);
    let topic_id_b: String = t_b.get(1).unwrap().into_val(&env);

    assert_eq!(topic_id_a, id_a);
    assert_eq!(topic_id_b, id_b);
    assert_ne!(topic_id_a, topic_id_b);
}

#[test]
fn data_decodes_back_to_amount_asset_created_at_tuple() {
    let env = Env::default();
    let asset = addr_asset(&env);
    let amount: i128 = 12_345_678_i128;
    let created_at: u64 = 1_700_000_000_u64;

    let payload: Val = data(&env, amount, &asset, created_at);

    let decoded: (i128, Address, u64) = payload.into_val(&env);
    assert_eq!(decoded, (amount, asset.clone(), created_at));
}

#[test]
fn data_handles_zero_and_large_values() {
    let env = Env::default();
    let asset = addr_asset(&env);

    let zero: Val = data(&env, 0_i128, &asset, 0_u64);
    let decoded_zero: (i128, Address, u64) = zero.into_val(&env);
    assert_eq!(decoded_zero, (0_i128, asset.clone(), 0_u64));

    let big: Val = data(
        &env,
        i128::MAX / 2,
        &asset,
        u64::MAX,
    );
    let decoded_big: (i128, Address, u64) = big.into_val(&env);
    assert_eq!(decoded_big, (i128::MAX / 2, asset, u64::MAX));
}
