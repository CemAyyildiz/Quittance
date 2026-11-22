//! Example usage of the payer_allowlist_per_invoice contract.
//!
//! This example demonstrates how to use the contract to manage per-invoice
//! payer allowlists.

use payer_allowlist_per_invoice::PayerAllowlistPerInvoiceClient;
use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol};

fn main() {
    let env = Env::default();

    // Register the contract
    let contract_id = env.register(payer_allowlist_per_invoice::PayerAllowlistPerInvoice, ());
    let client = PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

    // Create some test addresses
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Create invoice IDs
    let invoice1 = Symbol::new(&env, "INV-001");
    let invoice2 = Symbol::new(&env, "INV-002");

    println!("=== Payer Allowlist Per Invoice Example ===\n");

    // Example 1: No allowlist (all payers allowed)
    println!("Example 1: No allowlist set");
    println!("Alice allowed on INV-001: {}", client.is_allowed(&invoice1, &alice));
    println!("Bob allowed on INV-001: {}", client.is_allowed(&invoice1, &bob));
    println!();

    // Example 2: Set an allowlist for invoice1
    println!("Example 2: Set allowlist for INV-001 to [Alice, Bob]");
    let allowlist = vec![&env, alice.clone(), bob.clone()];
    client.set_allowlist(&invoice1, &allowlist);
    println!("Alice allowed on INV-001: {}", client.is_allowed(&invoice1, &alice));
    println!("Bob allowed on INV-001: {}", client.is_allowed(&invoice1, &bob));
    println!("Charlie allowed on INV-001: {}", client.is_allowed(&invoice1, &charlie));
    println!();

    // Example 3: Different allowlist for invoice2
    println!("Example 3: Set allowlist for INV-002 to [Charlie]");
    let allowlist2 = vec![&env, charlie.clone()];
    client.set_allowlist(&invoice2, &allowlist2);
    println!("Alice allowed on INV-002: {}", client.is_allowed(&invoice2, &alice));
    println!("Charlie allowed on INV-002: {}", client.is_allowed(&invoice2, &charlie));
    println!();

    // Example 4: Clear allowlist
    println!("Example 4: Clear allowlist for INV-001");
    client.set_allowlist(&invoice1, &vec![&env]);
    println!("Alice allowed on INV-001: {}", client.is_allowed(&invoice1, &alice));
    println!("Charlie allowed on INV-001: {}", client.is_allowed(&invoice1, &charlie));
    println!();

    println!("=== Example Complete ===");
}
