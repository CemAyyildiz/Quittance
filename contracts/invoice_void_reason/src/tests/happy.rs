use super::{client, invoice, issuer};

use crate::VoidReason;
use soroban_sdk::Env;

#[test]
fn issuer_voids_an_invoice_with_a_reason() {
    let env = Env::default();
    env.mock_all_auths();
    let api = client(&env);
    let who = issuer(&env);
    let id = invoice(&env, "inv_1");

    assert!(api.can_pay(&id));
    assert!(api.void(&who, &id, &VoidReason::Cancelled));
    assert!(api.is_voided(&id));

    let stored = api.reason_of(&id).expect("record");
    assert_eq!(stored.reason, VoidReason::Cancelled);
    assert_eq!(stored.issuer, who);
}
