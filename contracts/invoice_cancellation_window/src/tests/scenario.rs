use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{InvoiceCancellationWindow, InvoiceCancellationWindowClient};

#[test]
fn independent_invoices_have_isolated_cancellation_states() {
    let env = Env::default();
    let payer_a = address(&env);
    let payer_b = address(&env);
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    env.mock_all_auths();

    let inv_a = symbol_short!("order_a");
    let inv_b = symbol_short!("order_b");

    client.cancel(&payer_a, &inv_a, &1000, &1010, &20);

    assert!(client.is_cancelled(&inv_a));
    assert!(!client.is_cancelled(&inv_b));

    client.cancel(&payer_b, &inv_b, &1000, &1015, &20);
    assert!(client.is_cancelled(&inv_b));
}
