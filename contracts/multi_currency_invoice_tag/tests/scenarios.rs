//! Scenario tests for `multi-currency-invoice-tag`.
//!
//! These exercise the tag the way Quittance would use it: validate a payer's
//! proposed asset before the transfer, handle a batch of invoices each with
//! its own currency, and survive repeated conflicts without moving a tag.

mod common;

use common::setup;
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn a_payers_proposed_asset_is_validated_before_the_transfer() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    // Invoice is created denominated in XLM.
    assert!(client.tag_invoice(&invoice, &xlm));

    // The payer proposes USDC: validation fails, so no transfer should
    // happen.
    assert!(!client.matches_tag(&invoice, &usdc));

    // The payer proposes XLM: validation passes and settlement may proceed.
    assert!(client.matches_tag(&invoice, &xlm));
}

#[test]
fn each_invoice_in_a_batch_is_validated_against_its_own_tag() {
    let (env, client) = setup();

    let currencies = [("INV1", "XLM"), ("INV2", "USDC"), ("INV3", "EUR")];
    for (name, code) in currencies {
        let invoice = Symbol::new(&env, name);
        let asset = Symbol::new(&env, code);
        assert!(client.tag_invoice(&invoice, &asset));
    }

    // Each invoice accepts only its own currency; every other pairing is
    // rejected.
    for (inv_name, own_code) in currencies {
        let invoice = Symbol::new(&env, inv_name);
        for (_, code) in currencies {
            let asset = Symbol::new(&env, code);
            assert_eq!(
                client.matches_tag(&invoice, &asset),
                code == own_code,
                "invoice {inv_name} vs asset {code}"
            );
        }
    }
}

#[test]
fn a_settlement_flow_tags_validates_then_settles() {
    let (_env, client) = setup();
    let invoice = symbol_short!("INV1");
    let usdc = symbol_short!("USDC");
    let eur = symbol_short!("EUR");

    // 1. Creation: tag the invoice.
    assert!(client.tag_invoice(&invoice, &usdc));

    // 2. Validation: a wrong-asset transfer attempt is refused.
    assert!(!client.matches_tag(&invoice, &eur));

    // 3. Validation: the correct asset passes.
    assert!(client.matches_tag(&invoice, &usdc));

    // 4. The failed attempt did not move the tag.
    assert!(client.tag_invoice(&invoice, &usdc));
    assert!(!client.tag_invoice(&invoice, &eur));
    assert!(client.matches_tag(&invoice, &usdc));
}

#[test]
fn many_invoices_all_tagged_in_the_same_currency_validate_together() {
    let (env, client) = setup();
    let xlm = symbol_short!("XLM");

    let invoices = [
        Symbol::new(&env, "INV1"),
        Symbol::new(&env, "INV2"),
        Symbol::new(&env, "INV3"),
        Symbol::new(&env, "INV4"),
        Symbol::new(&env, "INV5"),
    ];
    for invoice in &invoices {
        assert!(client.tag_invoice(invoice, &xlm));
    }
    for invoice in &invoices {
        assert!(client.matches_tag(invoice, &xlm));
        assert!(!client.matches_tag(invoice, &symbol_short!("USDC")));
    }
}

#[test]
fn tag_and_query_traffic_stays_isolated_per_invoice_under_churn() {
    let (env, client) = setup();
    let invoice_a = Symbol::new(&env, "INVA");
    let invoice_b = Symbol::new(&env, "INVB");
    client.tag_invoice(&invoice_a, &symbol_short!("XLM"));
    client.tag_invoice(&invoice_b, &symbol_short!("USDC"));

    // Churn: both invoices are repeatedly challenged with codes neither of
    // them is tagged with.
    for challenger in ["EUR", "USDT", "BTC"] {
        let asset = Symbol::new(&env, challenger);
        assert!(!client.tag_invoice(&invoice_a, &asset));
        assert!(!client.tag_invoice(&invoice_b, &asset));
        assert!(!client.matches_tag(&invoice_a, &asset));
        assert!(!client.matches_tag(&invoice_b, &asset));
    }

    // After all the churn each invoice still settles in its original code.
    assert!(client.matches_tag(&invoice_a, &symbol_short!("XLM")));
    assert!(client.matches_tag(&invoice_b, &symbol_short!("USDC")));
}
