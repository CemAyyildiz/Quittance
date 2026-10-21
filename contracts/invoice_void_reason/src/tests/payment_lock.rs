use super::{client, invoice, issuer};

use crate::VoidReason;
use soroban_sdk::Env;

#[test]
fn voided_invoice_cannot_be_paid() {
    let env = Env::default();
    env.mock_all_auths();
    let api = client(&env);
    let id = invoice(&env, "inv_pay");

    assert!(api.can_pay(&id));
    assert!(api.void(&issuer(&env), &id, &VoidReason::Fraud));
    assert!(!api.can_pay(&id));
}
