use super::{address, invoice_id};
use soroban_sdk::{vec, Env};

#[test]
fn payer_not_in_allowlist_is_denied() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_DENY");
    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set allowlist with Alice and Bob
    let allowlist = vec![&env, alice.clone(), bob.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Charlie is not in the list and should be denied
    assert!(!client.is_allowed(&invoice, &charlie));
}

#[test]
fn after_removing_from_allowlist_payer_is_denied() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_REMOVE");
    let alice = address(&env);
    let bob = address(&env);

    // Initially include both
    let allowlist = vec![&env, alice.clone(), bob.clone()];
    client.set_allowlist(&invoice, &allowlist);

    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));

    // Update allowlist to only include Alice
    let new_allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &new_allowlist);

    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));
}

#[test]
fn all_addresses_denied_when_allowlist_set_without_them() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_NONE");
    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set allowlist with only Charlie
    let allowlist = vec![&env, charlie.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Alice and Bob are not in the list
    assert!(!client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));
    assert!(client.is_allowed(&invoice, &charlie));
}

#[test]
fn checking_nonexistent_invoice_allows_all() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "NONEXIST");
    let alice = address(&env);

    // Without setting any allowlist, should allow
    assert!(client.is_allowed(&invoice, &alice));
}

#[test]
fn checking_wrong_invoice_uses_correct_allowlist() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_X");
    let invoice2 = invoice_id(&env, "INV_Y");
    let alice = address(&env);
    let bob = address(&env);

    // Set allowlist for invoice1 only
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice1, &allowlist);

    // Alice is allowed on invoice1
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(!client.is_allowed(&invoice1, &bob));

    // invoice2 has no allowlist, so all are allowed
    assert!(client.is_allowed(&invoice2, &alice));
    assert!(client.is_allowed(&invoice2, &bob));
}

#[test]
fn multiple_denials() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_MULTI_DENY");
    let alice = address(&env);

    // Set allowlist without Alice
    let allowlist = vec![&env, address(&env)];
    client.set_allowlist(&invoice, &allowlist);

    // Check multiple times that Alice is denied
    assert!(!client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &alice));
}
