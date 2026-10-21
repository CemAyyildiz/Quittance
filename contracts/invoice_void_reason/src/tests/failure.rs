use super::{client, invoice, issuer};

use crate::VoidReason;
use soroban_sdk::Env;

#[test]
#[should_panic]
fn void_without_auth_panics() {
    let env = Env::default();
    let api = client(&env);
    api.void(&issuer(&env), &invoice(&env, "inv_auth"), &VoidReason::Fraud);
}

#[test]
fn missing_invoice_is_not_voided() {
    let env = Env::default();
    let api = client(&env);
    let id = invoice(&env, "inv_missing");
    assert!(!api.is_voided(&id));
    assert!(api.reason_of(&id).is_none());
}
