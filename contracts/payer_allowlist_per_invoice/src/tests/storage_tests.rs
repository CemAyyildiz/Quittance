use super::{address, invoice_id};
use soroban_sdk::{vec, Env};

#[test]
fn storage_persists_across_calls() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_PERSIST");
    let alice = address(&env);
    let bob = address(&env);

    // Set an allowlist
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Multiple reads should return consistent results
    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));
    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));
}

#[test]
fn overwrite_storage() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_OVERWRITE");
    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set initial allowlist
    let allowlist1 = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist1);
    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));

    // Overwrite with new allowlist
    let allowlist2 = vec![&env, bob.clone(), charlie.clone()];
    client.set_allowlist(&invoice, &allowlist2);
    assert!(!client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
    assert!(client.is_allowed(&invoice, &charlie));
}

#[test]
fn remove_from_storage() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_REMOVE_STORAGE");
    let alice = address(&env);

    // Set an allowlist
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);
    assert!(client.is_allowed(&invoice, &alice));

    // Clear the allowlist (should remove from storage)
    client.set_allowlist(&invoice, &vec![&env]);

    // Should now behave as if no allowlist was ever set
    let bob = address(&env);
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
}

#[test]
fn multiple_invoices_independent_storage() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_STORAGE_1");
    let invoice2 = invoice_id(&env, "INV_STORAGE_2");
    let invoice3 = invoice_id(&env, "INV_STORAGE_3");

    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set allowlists for multiple invoices
    client.set_allowlist(&invoice1, &vec![&env, alice.clone()]);
    client.set_allowlist(&invoice2, &vec![&env, bob.clone()]);
    client.set_allowlist(&invoice3, &vec![&env, charlie.clone()]);

    // Verify each is stored independently
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(!client.is_allowed(&invoice1, &bob));
    assert!(client.is_allowed(&invoice2, &bob));
    assert!(!client.is_allowed(&invoice2, &charlie));
    assert!(client.is_allowed(&invoice3, &charlie));
    assert!(!client.is_allowed(&invoice3, &alice));
}

#[test]
fn storage_handles_same_address_different_invoices() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_SAME_ADDR_1");
    let invoice2 = invoice_id(&env, "INV_SAME_ADDR_2");
    let alice = address(&env);

    // Add Alice to both invoices
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice1, &allowlist.clone());
    client.set_allowlist(&invoice2, &allowlist);

    // Both should allow Alice
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(client.is_allowed(&invoice2, &alice));

    // Remove Alice from invoice1 only
    client.set_allowlist(&invoice1, &vec![&env]);

    // invoice1 should now allow all (cleared)
    // invoice2 should still only allow Alice
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(client.is_allowed(&invoice2, &alice));

    let bob = address(&env);
    assert!(client.is_allowed(&invoice1, &bob)); // invoice1 cleared
    assert!(!client.is_allowed(&invoice2, &bob)); // invoice2 still restricted
}

#[test]
fn empty_vector_removes_storage_entry() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice = invoice_id(&env, "INV_EMPTY_REMOVE");
    let alice = address(&env);
    let bob = address(&env);

    // Set a non-empty allowlist
    let allowlist = vec![&env, alice.clone()];
    client.set_allowlist(&invoice, &allowlist);

    // Verify it's restricted
    assert!(client.is_allowed(&invoice, &alice));
    assert!(!client.is_allowed(&invoice, &bob));

    // Set empty vector (should remove storage entry)
    let empty = vec![&env];
    client.set_allowlist(&invoice, &empty);

    // Now both should be allowed (no restrictions)
    assert!(client.is_allowed(&invoice, &alice));
    assert!(client.is_allowed(&invoice, &bob));
}
