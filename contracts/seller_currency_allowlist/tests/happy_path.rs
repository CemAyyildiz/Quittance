//! Happy-path tests for `seller-currency-allowlist`.
//!
//! These cover the successful path: a seller opts in to currencies, queries
//! confirm them, and other sellers stay unaffected.

mod common;

use common::{seller, setup};
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn a_currency_is_not_allowed_until_the_seller_opts_in() {
    let (_env, client) = setup();
    let s = seller(&_env);

    assert!(!client.is_allowed_currency(&s, &symbol_short!("XLM")));
}

#[test]
fn a_seller_can_allow_a_currency_and_then_query_it() {
    let (_env, client) = setup();
    let s = seller(&_env);
    let xlm = symbol_short!("XLM");

    client.allow_currency(&s, &xlm);

    assert!(client.is_allowed_currency(&s, &xlm));
}

#[test]
fn a_seller_can_allow_multiple_currencies() {
    let (_env, client) = setup();
    let s = seller(&_env);
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");
    let eur = symbol_short!("EUR");

    client.allow_currency(&s, &xlm);
    client.allow_currency(&s, &usdc);
    client.allow_currency(&s, &eur);

    assert!(client.is_allowed_currency(&s, &xlm));
    assert!(client.is_allowed_currency(&s, &usdc));
    assert!(client.is_allowed_currency(&s, &eur));
    // A currency the seller never opted in to stays off the list.
    assert!(!client.is_allowed_currency(&s, &symbol_short!("GBP")));
}

#[test]
fn allowing_the_same_currency_twice_is_idempotent() {
    let (_env, client) = setup();
    let s = seller(&_env);
    let usdc = symbol_short!("USDC");

    client.allow_currency(&s, &usdc);
    // A retried allow transaction succeeds and does not duplicate anything.
    client.allow_currency(&s, &usdc);

    assert!(client.is_allowed_currency(&s, &usdc));
}

#[test]
fn allowlists_are_isolated_between_sellers() {
    let (_env, client) = setup();
    let alice = seller(&_env);
    let bob = seller(&_env);
    let xlm = symbol_short!("XLM");

    client.allow_currency(&alice, &xlm);

    // Alice's opt-in says nothing about Bob.
    assert!(client.is_allowed_currency(&alice, &xlm));
    assert!(!client.is_allowed_currency(&bob, &xlm));
}

#[test]
fn different_sellers_can_allow_the_same_currency_independently() {
    let (_env, client) = setup();
    let alice = seller(&_env);
    let bob = seller(&_env);
    let usdc = symbol_short!("USDC");

    client.allow_currency(&alice, &usdc);
    client.allow_currency(&bob, &usdc);

    assert!(client.is_allowed_currency(&alice, &usdc));
    assert!(client.is_allowed_currency(&bob, &usdc));
}

#[test]
fn a_query_for_a_code_allowed_by_one_seller_does_not_leak_to_another() {
    let (_env, client) = setup();
    let alice = seller(&_env);
    let stranger = seller(&_env);

    client.allow_currency(&alice, &symbol_short!("EUR"));
    client.allow_currency(&alice, &symbol_short!("GBP"));

    for code in ["EUR", "GBP"] {
        let asset = Symbol::new(&_env, code);
        assert!(client.is_allowed_currency(&alice, &asset));
        assert!(!client.is_allowed_currency(&stranger, &asset));
    }
}
