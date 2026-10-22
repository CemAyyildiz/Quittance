//! Concept scenario: downstream late-fee logic consulting the waiver ledger.
//!
//! Simulates the intended integration: a late-fee pass asks `has_waiver`
//! before charging, and calls `consume_waiver` when it waives a fee. The
//! waiver must fire exactly once per invoice, and the next late period must
//! charge again.

use invoice_grace_fee_waiver::{InvoiceGraceFeeWaiver, InvoiceGraceFeeWaiverClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn late_fee_is_waived_exactly_once_per_invoice() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceGraceFeeWaiver, (&admin,));
    let client = InvoiceGraceFeeWaiverClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV001");
    let late_fee: i128 = 250;

    // Simulates the downstream charge: skip the fee only if a waiver exists.
    let charge = |client: &InvoiceGraceFeeWaiverClient<'_>| -> i128 {
        if client.consume_waiver(&invoice) {
            0
        } else {
            late_fee
        }
    };

    // Admin waives the first late fee.
    assert!(client.grant_waiver(&admin, &invoice));
    assert!(client.has_waiver(&invoice));

    // First late period: charged nothing, waiver consumed.
    assert_eq!(charge(&client), 0);
    assert!(!client.has_waiver(&invoice));

    // Second late period: the waiver is gone; the fee applies again.
    assert_eq!(charge(&client), late_fee);
}
