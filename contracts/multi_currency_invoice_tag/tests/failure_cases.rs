//! Failure-case tests for `multi-currency-invoice-tag`.
//!
//! Every rejection path: a conflicting re-tag is refused, an untagged
//! invoice matches nothing, and a refused re-tag never alters the stored
//! tag.

mod common;

use common::setup;
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn retagging_with_a_different_asset_is_rejected() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    assert!(client.tag_invoice(&invoice, &xlm));
    assert!(!client.tag_invoice(&invoice, &usdc));
}

#[test]
fn a_rejected_retag_preserves_the_original_tag() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    client.tag_invoice(&invoice, &xlm);
    assert!(!client.tag_invoice(&invoice, &usdc));

    // The original tag still settles; the refused code still does not.
    assert!(client.matches_tag(&invoice, &xlm));
    assert!(!client.matches_tag(&invoice, &usdc));
}

#[test]
fn repeated_conflicting_retags_keep_failing_and_change_nothing() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");
    let eur = symbol_short!("EUR");

    client.tag_invoice(&invoice, &xlm);
    for _ in 0..3 {
        assert!(!client.tag_invoice(&invoice, &eur));
    }
    assert!(client.matches_tag(&invoice, &xlm));
}

#[test]
fn an_untagged_invoice_matches_nothing() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");

    assert!(!client.matches_tag(&invoice, &symbol_short!("XLM")));
    assert!(!client.matches_tag(&invoice, &symbol_short!("USDC")));
    assert!(!client.matches_tag(&invoice, &symbol_short!("EUR")));
}

#[test]
fn a_failed_retag_never_creates_a_second_tag() {
    let (env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");
    let other = Symbol::new(&env, "USDT");

    client.tag_invoice(&invoice, &xlm);
    assert!(!client.tag_invoice(&invoice, &other));

    // Only the first tag exists: the refused code matches nowhere.
    assert!(!client.matches_tag(&invoice, &other));
    assert!(client.matches_tag(&invoice, &xlm));
}

#[test]
fn tagging_one_invoice_does_not_leak_into_another() {
    let (_env, client) = setup();
    let tagged = symbol_short!("INV1");
    let untouched = symbol_short!("INV2");
    let xlm = symbol_short!("XLM");

    client.tag_invoice(&tagged, &xlm);

    // INV2 was never tagged, so it matches nothing — including INV1's code.
    assert!(!client.matches_tag(&untouched, &xlm));
}

#[test]
fn a_conflict_on_one_invoice_does_not_affect_its_sibling() {
    let (_env, client) = setup();
    let first = symbol_short!("INV1");
    let second = symbol_short!("INV2");
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    client.tag_invoice(&first, &xlm);
    client.tag_invoice(&second, &usdc);

    // First invoice cannot be re-tagged…
    assert!(!client.tag_invoice(&first, &usdc));
    // …and the second invoice's tag is unaffected by that failure.
    assert!(client.matches_tag(&second, &usdc));
    assert!(client.matches_tag(&first, &xlm));
}
