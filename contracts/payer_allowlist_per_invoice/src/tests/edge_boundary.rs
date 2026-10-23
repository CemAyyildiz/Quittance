use super::{address, invoice_id};
use soroban_sdk::{vec, Env};

#[test]
fn empty_allowlist_clears_restrictions() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_EMPTY");
    let alice = address(&env);

    // Set an empty allowlist explicitly
    let empty_list = vec![&env];
    client.set_allowlist(&invoice, &empty_list);

    // Should allow all payers
    assert!(client.is_allowed(&invoice, &alice));
}

#[test]
fn large_allowlist() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_LARGE");

    // Create a large allowlist
    let mut addresses = vec![&env];
    for _ in 0..50 {
        addresses.push_back(address(&env));
    }

    let test_addr = address(&env);

    // Set the large allowlist
    client.set_allowlist(&invoice, &addresses);

    // The test address should not be in the list
    assert!(!client.is_allowed(&invoice, &test_addr));

    // Add the test address to the allowlist
    addresses.push_back(test_addr.clone());
    client.set_allowlist(&invoice, &addresses);

    // Now it should be allowed
    assert!(client.is_allowed(&invoice, &test_addr));
}

#[test]
fn multiple_checks_same_payer() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_MULTI");
    let alice = address(&env);

    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Check multiple times
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &alice));
}

#[test]
fn duplicate_addresses_in_allowlist() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_DUP");
    let alice = address(&env);
    let bob = address(&env);

    // Create allowlist with duplicates
    let allowlist = vec![&env, alice.clone(), bob.clone(), alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Should still work correctly
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
}

#[test]
fn very_long_invoice_id() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    // Soroban Symbol has a maximum length, but let's use a reasonably long one
    let invoice = invoice_id(&env, "INV123456789");
    let alice = address(&env);

    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    assert!(client.is_allowed(&invoice, &alice));
}

#[test]
fn check_before_and_after_setting_allowlist() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_BA");
    let alice = address(&env);
    let bob = address(&env);

    // Before setting allowlist
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));

    // After setting allowlist
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));
}

#[test]
fn same_address_different_invoices() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_A");
    let invoice2 = invoice_id(&env, "INV_B");
    let alice = address(&env);

    // Allow Alice on invoice1 only
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice1, &allowlist);

    // Alice should be allowed on invoice1 but not on invoice2
    assert!(client.is_allowed(&invoice1, &alice));
    // invoice2 has no allowlist, so all are allowed
    assert!(client.is_allowed(&invoice2, &alice));
}
