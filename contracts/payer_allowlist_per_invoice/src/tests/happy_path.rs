use super::{address, invoice_id};
use soroban_sdk::{vec, Env};

#[test]
fn no_allowlist_allows_all_payers() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_001");
    let alice = address(&env);
    let bob = address(&env);

    // Without setting an allowlist, all payers should be allowed
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
}

#[test]
fn set_allowlist_restricts_payers() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_002");
    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set allowlist with only Alice and Bob
    let allowlist = vec![&env, alice.clone(), bob.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Alice and Bob should be allowed
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));

    // Charlie should not be allowed
    assert!(!client.is_allowed(&invoice, &charlie));
}

#[test]
fn clear_allowlist_allows_all_again() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_003");
    let alice = address(&env);
    let bob = address(&env);

    // Set an allowlist
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);
    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));

    // Clear the allowlist by passing an empty vector
    client.set_allowlist(&invoice, &vec![&env]);

    // Now all payers should be allowed
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
}

#[test]
fn replace_allowlist() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_004");
    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set initial allowlist with Alice
    let allowlist1 = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist1);
    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));

    // Replace with a new allowlist containing Bob and Charlie
    let allowlist2 = vec![&env, bob.clone(), charlie.clone()];
    client.set_allowlist(&invoice, &allowlist2);
    assert!(!client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
    assert!(client.is_allowed(&invoice, &charlie));
}

#[test]
fn single_payer_allowlist() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_005");
    let alice = address(&env);
    let bob = address(&env);

    // Set allowlist with only one address
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));
}
