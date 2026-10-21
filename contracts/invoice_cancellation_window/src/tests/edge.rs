use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{InvoiceCancellationWindow, InvoiceCancellationWindowClient};

#[test]
fn cancel_at_exact_boundary_ledgers() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    env.mock_all_auths();

    let created_at = 200u32;
    let window = 10u32;

    // Exact moment of creation: ledger == created_at
    let inv1 = symbol_short!("inv_b1");
    assert!(client.can_cancel(&created_at, &created_at, &window));
    client.cancel(&payer, &inv1, &created_at, &created_at, &window);
    assert!(client.is_cancelled(&inv1));

    // Exact boundary ledger: created_at + window
    let inv2 = symbol_short!("inv_b2");
    let deadline = created_at + window;
    assert!(client.can_cancel(&created_at, &deadline, &window));
    client.cancel(&payer, &inv2, &created_at, &deadline, &window);
    assert!(client.is_cancelled(&inv2));
}

#[test]
fn zero_window_only_allows_creation_ledger() {
    let env = Env::default();
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);

    let created_at = 500u32;
    let window = 0u32;

    assert!(client.can_cancel(&created_at, &500, &window));
    assert!(!client.can_cancel(&created_at, &501, &window));
}
