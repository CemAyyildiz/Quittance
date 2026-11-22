//! Happy-path tests for `multi-currency-invoice-tag`.
//!
//! These cover the successful path: an invoice is tagged once, the matching
//! asset validates, and conflicting assets do not.

mod common;

use common::setup;
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn an_invoice_can_be_tagged_at_creation_time() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");

    assert!(client.tag_invoice(&invoice, &xlm));
}

#[test]
fn a_tagged_invoice_matches_its_own_asset() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");

    client.tag_invoice(&invoice, &xlm);

    assert!(client.matches_tag(&invoice, &xlm));
}

#[test]
fn a_tagged_invoice_does_not_match_a_different_asset() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    client.tag_invoice(&invoice, &xlm);

    assert!(!client.matches_tag(&invoice, &usdc));
}

#[test]
fn re_tagging_with_the_same_asset_succeeds() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let usdc = symbol_short!("USDC");

    assert!(client.tag_invoice(&invoice, &usdc));
    // A retried tagging transaction is a safe no-op.
    assert!(client.tag_invoice(&invoice, &usdc));

    assert!(client.matches_tag(&invoice, &usdc));
}

#[test]
fn different_invoices_tag_independently() {
    let (_env, client) = setup();
    let first = symbol_short!("INV1");
    let second = symbol_short!("INV2");
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    assert!(client.tag_invoice(&first, &xlm));
    assert!(client.tag_invoice(&second, &usdc));

    assert!(client.matches_tag(&first, &xlm));
    assert!(!client.matches_tag(&first, &usdc));
    assert!(client.matches_tag(&second, &usdc));
    assert!(!client.matches_tag(&second, &xlm));
}

#[test]
fn the_same_asset_can_tag_many_invoices() {
    let (env, client) = setup();
    let usdc = symbol_short!("USDC");

    for name in ["INV1", "INV2", "INV3"] {
        let invoice = Symbol::new(&env, name);
        assert!(client.tag_invoice(&invoice, &usdc));
        assert!(client.matches_tag(&invoice, &usdc));
    }
}
