//! Edge and boundary tests for `seller-currency-allowlist`.
//!
//! These cover the edges of the asset-code rules: the shortest and longest
//! valid codes, case sensitivity, digit-only codes, and the exact
//! 12-vs-13-character boundary.

mod common;

use common::{seller, setup};
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn a_single_character_code_is_valid() {
    let (env, client) = setup();
    let s = seller(&env);
    let x = symbol_short!("X");

    client.allow_currency(&s, &x);

    assert!(client.is_allowed_currency(&s, &x));
}

#[test]
fn an_exactly_twelve_character_code_is_valid() {
    let (env, client) = setup();
    let s = seller(&env);
    let twelve = Symbol::new(&env, "ABCDEFGH1234"); // 12 characters

    client.allow_currency(&s, &twelve);

    assert!(client.is_allowed_currency(&s, &twelve));
}

#[test]
fn a_thirteen_character_code_is_past_the_boundary_and_rejected() {
    let (env, client) = setup();
    let s = seller(&env);
    let thirteen = Symbol::new(&env, "ABCDEFGH12345"); // 13 characters

    let result = client.try_allow_currency(&s, &thirteen);
    assert_eq!(
        result,
        Err(Ok(
            seller_currency_allowlist::AllowlistError::InvalidAssetCode
        ))
    );
    assert!(!client.is_allowed_currency(&s, &thirteen));
}

#[test]
fn codes_are_case_sensitive_distinct_entries() {
    let (env, client) = setup();
    let s = seller(&env);
    let upper = symbol_short!("XLM");
    let lower = symbol_short!("xlm");

    client.allow_currency(&s, &upper);

    // `xlm` is a different symbol, so it is not on the list yet…
    assert!(!client.is_allowed_currency(&s, &lower));
    // …but a seller may legitimately allow it as its own entry.
    client.allow_currency(&s, &lower);
    assert!(client.is_allowed_currency(&s, &upper));
    assert!(client.is_allowed_currency(&s, &lower));
}

#[test]
fn digit_only_codes_are_valid() {
    let (env, client) = setup();
    let s = seller(&env);
    let digits = symbol_short!("123");

    client.allow_currency(&s, &digits);

    assert!(client.is_allowed_currency(&s, &digits));
}

#[test]
fn alphanumeric_mixed_codes_are_valid() {
    let (env, client) = setup();
    let s = seller(&env);
    let mixed = Symbol::new(&env, "USD2XLM3"); // letters and digits

    client.allow_currency(&s, &mixed);

    assert!(client.is_allowed_currency(&s, &mixed));
}

#[test]
fn the_boundary_between_one_and_two_characters_is_open_at_both_ends() {
    let (env, client) = setup();
    let s = seller(&env);
    let one = Symbol::new(&env, "A");
    let two = Symbol::new(&env, "AB");

    client.allow_currency(&s, &one);
    client.allow_currency(&s, &two);

    assert!(client.is_allowed_currency(&s, &one));
    assert!(client.is_allowed_currency(&s, &two));
    assert!(!client.is_allowed_currency(&s, &Symbol::new(&env, "ABC")));
}

#[test]
fn reallowing_at_the_length_boundary_is_still_idempotent() {
    let (env, client) = setup();
    let s = seller(&env);
    let twelve = Symbol::new(&env, "ABCDEFGH1234");

    client.allow_currency(&s, &twelve);
    client.allow_currency(&s, &twelve);

    assert!(client.is_allowed_currency(&s, &twelve));
}
