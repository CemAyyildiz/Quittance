//! Edge and boundary tests for `multi-currency-invoice-tag`.
//!
//! These cover symbol-space edges: single-character codes, case sensitivity,
//! one-character differences, long codes, and the two symbol construction
//! forms.

mod common;

use common::setup;
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn a_single_character_asset_code_works() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let x = symbol_short!("X");

    assert!(client.tag_invoice(&invoice, &x));
    assert!(client.matches_tag(&invoice, &x));
    assert!(!client.matches_tag(&invoice, &symbol_short!("Y")));
}

#[test]
fn asset_code_matching_is_case_sensitive() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");

    client.tag_invoice(&invoice, &xlm);

    assert!(client.matches_tag(&invoice, &xlm));
    assert!(!client.matches_tag(&invoice, &symbol_short!("xlm")));
    assert!(!client.matches_tag(&invoice, &symbol_short!("Xlm")));
}

#[test]
fn symbols_differing_by_one_character_do_not_match() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    client.tag_invoice(&invoice, &usd);

    assert!(client.matches_tag(&invoice, &usd));
    assert!(!client.matches_tag(&invoice, &symbol_short!("USX")));
    assert!(!client.matches_tag(&invoice, &symbol_short!("US")));
    assert!(!client.matches_tag(&invoice, &symbol_short!("USDD")));
}

#[test]
fn a_twelve_character_asset_code_works() {
    let (env, client) = setup();
    let invoice = symbol_short!("INV1");
    let long_code = Symbol::new(&env, "ABCDEFGH1234"); // 12 characters

    assert!(client.tag_invoice(&invoice, &long_code));
    assert!(client.matches_tag(&invoice, &long_code));
    assert!(!client.matches_tag(&invoice, &symbol_short!("ABCD")));
}

#[test]
fn short_and_general_symbol_forms_compare_equal() {
    let (env, client) = setup();
    let invoice = symbol_short!("INV1");
    let short_form = symbol_short!("USDC");
    let general_form = Symbol::new(&env, "USDC");

    assert!(client.tag_invoice(&invoice, &short_form));
    // The same asset code built the other way still matches.
    assert!(client.matches_tag(&invoice, &general_form));
    assert_eq!(short_form, general_form);
}

#[test]
fn the_boundary_between_acceptance_and_rejection_is_exact() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let a = symbol_short!("XLM");
    let b = symbol_short!("USDC");

    assert!(client.tag_invoice(&invoice, &a));
    // Same code: accepted. Any other code: rejected.
    assert!(client.tag_invoice(&invoice, &a));
    assert!(!client.tag_invoice(&invoice, &b));
    assert!(client.matches_tag(&invoice, &a));
    assert!(!client.matches_tag(&invoice, &b));
}
