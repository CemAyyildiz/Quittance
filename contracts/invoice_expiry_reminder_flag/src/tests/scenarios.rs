use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn reminder_state_is_isolated_across_multiple_invoices() {
    let (_env, client) = setup();
    let inv_a = symbol_short!("INV_A");
    let inv_b = symbol_short!("INV_B");

    assert!(client.mark_reminded(&inv_a));
    assert!(client.was_reminded(&inv_a));
    assert!(!client.was_reminded(&inv_b));
}
