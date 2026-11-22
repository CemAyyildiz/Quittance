//! Scenario tests for `seller-currency-allowlist`.
//!
//! These exercise the allowlist the way Quittance would use it: a seller
//! configures the currency menu for their invoices, a payer validates a
//! proposed asset against it, and independent sellers churn through
//! updates without interfering.

mod common;

use common::{seller, setup};
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn a_seller_configures_a_currency_menu_that_payers_can_check() {
    let (_env, client) = setup();
    let s = seller(&_env);

    // The seller accepts XLM and USDC for new invoices.
    client.allow_currency(&s, &symbol_short!("XLM"));
    client.allow_currency(&s, &symbol_short!("USDC"));

    // A payer checks a proposed asset before creating an invoice.
    assert!(client.is_allowed_currency(&s, &symbol_short!("XLM")));
    assert!(client.is_allowed_currency(&s, &symbol_short!("USDC")));
    assert!(!client.is_allowed_currency(&s, &symbol_short!("EUR")));
}

#[test]
fn a_large_allowlist_of_many_codes_all_validate() {
    let (env, client) = setup();
    let s = seller(&env);

    let codes = [
        "XLM", "USDC", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "SGD", "HKD", "SEK", "NOK",
        "DKK",
    ];
    for code in codes {
        let asset = Symbol::new(&env, code);
        client.allow_currency(&s, &asset);
    }
    for code in codes {
        let asset = Symbol::new(&env, code);
        assert!(client.is_allowed_currency(&s, &asset), "{code} allowed");
    }
    // A code outside the menu is still refused.
    assert!(!client.is_allowed_currency(&s, &symbol_short!("DOGE")));
}

#[test]
fn sellers_with_different_preferences_do_not_interfere_under_churn() {
    let (env, client) = setup();
    let conservative = seller(&env);
    let diverse = seller(&env);

    // Conservative seller: native XLM only.
    client.allow_currency(&conservative, &symbol_short!("XLM"));
    // Diverse seller: a basket of stablecoins.
    for code in ["USDC", "USDT", "EUR"] {
        let asset = Symbol::new(&env, code);
        client.allow_currency(&diverse, &asset);
    }

    // Churn: both sellers keep extending their lists over time.
    client.allow_currency(&conservative, &symbol_short!("EUR"));
    client.allow_currency(&diverse, &symbol_short!("XLM"));

    // Every query stays scoped to the seller it was asked about.
    for code in ["XLM", "EUR", "USDC", "USDT"] {
        let asset = Symbol::new(&env, code);
        assert!(
            client.is_allowed_currency(&diverse, &asset),
            "diverse should have {code}"
        );
        let conservative_has = code == "XLM" || code == "EUR";
        assert_eq!(
            client.is_allowed_currency(&conservative, &asset),
            conservative_has,
            "conservative vs {code}"
        );
    }
}

#[test]
fn an_invalid_attempt_followed_by_a_valid_one_behaves_correctly() {
    let (env, client) = setup();
    let s = seller(&env);

    // 1. Rejected: not a valid asset code (underscore is not
    // alphanumeric, and it is the illegal byte a Symbol can carry).
    let bad = Symbol::new(&env, "NOT_A_CODE");
    assert!(client.try_allow_currency(&s, &bad).is_err());
    assert!(!client.is_allowed_currency(&s, &bad));

    // 2. Accepted: a valid code right after the failure.
    let good = symbol_short!("USDC");
    client.allow_currency(&s, &good);
    assert!(client.is_allowed_currency(&s, &good));

    // 3. The failure left no residue: the bad code is still not allowed.
    assert!(!client.is_allowed_currency(&s, &bad));
}

#[test]
fn the_check_works_for_sellers_who_never_configured_anything() {
    let (env, client) = setup();
    let silent = seller(&env);

    // A brand-new seller has an empty menu: every code is refused, and the
    // query itself never fails.
    for code in ["XLM", "USDC", "EUR", "JPY"] {
        let asset = Symbol::new(&env, code);
        assert!(!client.is_allowed_currency(&silent, &asset));
    }
}
