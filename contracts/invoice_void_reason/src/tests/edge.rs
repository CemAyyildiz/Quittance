use super::{client, invoice, issuer};

use crate::VoidReason;
use soroban_sdk::Env;

#[test]
fn second_void_keeps_the_first_reason() {
    let env = Env::default();
    env.mock_all_auths();
    let api = client(&env);
    let who = issuer(&env);
    let id = invoice(&env, "inv_twice");

    assert!(api.void(&who, &id, &VoidReason::Duplicate));
    assert!(!api.void(&who, &id, &VoidReason::Fraud));
    assert_eq!(
        api.reason_of(&id).expect("record").reason,
        VoidReason::Duplicate
    );
}

#[test]
fn a_second_invoice_stays_open() {
    let env = Env::default();
    env.mock_all_auths();
    let api = client(&env);
    let who = issuer(&env);
    let voided = invoice(&env, "inv_closed");
    let open = invoice(&env, "inv_open");

    assert!(api.void(&who, &voided, &VoidReason::Other));
    assert!(!api.is_voided(&open));
    assert!(api.can_pay(&open));
}
