use super::{address, invoice_id};
use soroban_sdk::{vec, Env};

#[test]
fn different_invoices_have_independent_allowlists() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_001");
    let invoice2 = invoice_id(&env, "INV_002");
    let invoice3 = invoice_id(&env, "INV_003");

    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // Set different allowlists for each invoice
    let allowlist1 = vec![&env, alice.clone()];
    let allowlist2 = vec![&env, bob.clone()];
    let allowlist3 = vec![&env, charlie.clone()];

    client.set_allowlist(&invoice1, &allowlist1);
    client.set_allowlist(&invoice2, &allowlist2);
    client.set_allowlist(&invoice3, &allowlist3);

    // Verify each invoice has its own independent allowlist
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(!client.is_allowed(&invoice1, &bob));
    assert!(!client.is_allowed(&invoice1, &charlie));

    assert!(!client.is_allowed(&invoice2, &alice));
    assert!(client.is_allowed(&invoice2, &bob));
    assert!(!client.is_allowed(&invoice2, &charlie));

    assert!(!client.is_allowed(&invoice3, &alice));
    assert!(!client.is_allowed(&invoice3, &bob));
    assert!(client.is_allowed(&invoice3, &charlie));
}

#[test]
fn updating_one_invoice_does_not_affect_others() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_A");
    let invoice2 = invoice_id(&env, "INV_B");

    let alice = address(&env);
    let bob = address(&env);

    // Set allowlists for both invoices
    let allowlist1 = vec![&env, alice.clone()];
    let allowlist2 = vec![&env, bob.clone()];

    client.set_allowlist(&invoice1, &allowlist1);
    client.set_allowlist(&invoice2, &allowlist2);

    // Verify initial state
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(!client.is_allowed(&invoice1, &bob));
    assert!(client.is_allowed(&invoice2, &bob));

    // Update invoice1's allowlist
    let new_allowlist1 = vec![&env, alice.clone(), bob.clone()];
    client.set_allowlist(&invoice1, &new_allowlist1);

    // invoice1 should be updated
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(client.is_allowed(&invoice1, &bob));

    // invoice2 should remain unchanged
    assert!(!client.is_allowed(&invoice2, &alice));
    assert!(client.is_allowed(&invoice2, &bob));
}

#[test]
fn clearing_one_invoice_does_not_affect_others() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_CLEAR1");
    let invoice2 = invoice_id(&env, "INV_CLEAR2");

    let alice = address(&env);
    let bob = address(&env);

    // Set allowlists for both invoices
    let allowlist1 = vec![&env, alice.clone()];
    let allowlist2 = vec![&env, bob.clone()];

    client.set_allowlist(&invoice1, &allowlist1);
    client.set_allowlist(&invoice2, &allowlist2);

    // Clear invoice1's allowlist
    client.set_allowlist(&invoice1, &vec![&env]);

    // invoice1 should now allow all
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(client.is_allowed(&invoice1, &bob));

    // invoice2 should remain restricted
    assert!(!client.is_allowed(&invoice2, &alice));
    assert!(client.is_allowed(&invoice2, &bob));
}

#[test]
fn many_invoices_with_different_allowlists() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let alice = address(&env);
    let bob = address(&env);

    // Create multiple invoices with different allowlists
    let invoice_names = ["INV_0", "INV_1", "INV_2", "INV_3", "INV_4", 
                         "INV_5", "INV_6", "INV_7", "INV_8", "INV_9"];
    
    for (i, name) in invoice_names.iter().enumerate() {
        let invoice = invoice_id(&env, name);

        if i % 2 == 0 {
            // Even invoices allow Alice
            let allowlist = vec![&env, alice.clone()];
            client.set_allowlist(&invoice, &allowlist);
            assert!(client.is_allowed(&invoice, &alice));
            assert!(!client.is_allowed(&invoice, &bob));
        } else {
            // Odd invoices allow Bob
            let allowlist = vec![&env, bob.clone()];
            client.set_allowlist(&invoice, &allowlist);
            assert!(!client.is_allowed(&invoice, &alice));
            assert!(client.is_allowed(&invoice, &bob));
        }
    }
}

#[test]
fn invoice_isolation_with_overlapping_payers() {
    let env = Env::default();
    let contract_id = env.register(crate::PayerAllowlistPerInvoice, ());
    let client = crate::PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    let invoice1 = invoice_id(&env, "INV_OVER1");
    let invoice2 = invoice_id(&env, "INV_OVER2");

    let alice = address(&env);
    let bob = address(&env);
    let charlie = address(&env);

    // invoice1 allows Alice and Bob
    let allowlist1 = vec![&env, alice.clone(), bob.clone()];
    client.set_allowlist(&invoice1, &allowlist1);

    // invoice2 allows Bob and Charlie
    let allowlist2 = vec![&env, bob.clone(), charlie.clone()];
    client.set_allowlist(&invoice2, &allowlist2);

    // Verify invoice1
    assert!(client.is_allowed(&invoice1, &alice));
    assert!(client.is_allowed(&invoice1, &bob));
    assert!(!client.is_allowed(&invoice1, &charlie));

    // Verify invoice2
    assert!(!client.is_allowed(&invoice2, &alice));
    assert!(client.is_allowed(&invoice2, &bob));
    assert!(client.is_allowed(&invoice2, &charlie));
}
