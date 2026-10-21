use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{InvoiceCancellationWindow, InvoiceCancellationWindowClient};

#[test]
fn cancels_within_window_and_records_state() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    env.mock_all_auths();

    let invoice = symbol_short!("inv_1");
    let created_at = 100u32;
    let window = 50u32;
    let current_ledger = 120u32;

    assert!(!client.is_cancelled(&invoice));
    assert!(client.can_cancel(&created_at, &current_ledger, &window));

    client.cancel(&payer, &invoice, &created_at, &current_ledger, &window);

    assert!(client.is_cancelled(&invoice));
}
