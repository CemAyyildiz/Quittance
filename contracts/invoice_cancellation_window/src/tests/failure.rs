use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{InvoiceCancellationWindow, InvoiceCancellationWindowClient};

#[test]
#[should_panic]
fn fails_when_window_closed() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    env.mock_all_auths();

    let invoice = symbol_short!("inv_f1");
    let created_at = 100u32;
    let window = 20u32;
    let current_ledger = 121u32; // 1 past deadline

    client.cancel(&payer, &invoice, &created_at, &current_ledger, &window);
}

#[test]
#[should_panic]
fn fails_on_invalid_ledger_progression() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    env.mock_all_auths();

    let invoice = symbol_short!("inv_f2");
    let created_at = 200u32;
    let window = 50u32;
    let current_ledger = 199u32; // before creation

    client.cancel(&payer, &invoice, &created_at, &current_ledger, &window);
}

#[test]
#[should_panic]
fn fails_on_repeated_cancellation() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    env.mock_all_auths();

    let invoice = symbol_short!("inv_f3");
    let created_at = 100u32;
    let window = 50u32;
    let current_ledger = 110u32;

    client.cancel(&payer, &invoice, &created_at, &current_ledger, &window);
    // Second call must panic
    client.cancel(&payer, &invoice, &created_at, &current_ledger, &window);
}
