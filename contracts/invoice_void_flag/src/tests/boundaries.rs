//! Boundary tests for `invoice-void-flag`.

use super::{new_seller, setup};
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn pre_registered_invoice_can_be_voided_by_its_registered_seller() {
    let (env, client) = setup();
    let seller = new_seller(&env);
    let inv = Symbol::new(&env, "INVOICE_BOUNDARY_2026_0001");

    client.register_invoice(&seller, &inv);
    assert!(!client.is_void(&inv));

    client.void_invoice(&seller, &inv);
    assert!(client.is_void(&inv));

    let untouched = symbol_short!("OTHER");
    assert!(!client.is_void(&untouched));
}
