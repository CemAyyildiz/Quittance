mod common;

use common::{record, setup};
use dispute_flag::DisputeFlagClient;
use soroban_sdk::{
    testutils::Ledger as _, testutils::MockAuth, testutils::MockAuthInvoke, IntoVal,
};

#[test]
fn payer_flag_blocks_finalization_until_resolver_resolves() {
    let (env, contract_id, resolver, payer, invoice_id) = setup();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert!(!client.is_finalizable(&invoice_id));

    record(&env, &contract_id, &resolver, &payer, &invoice_id, 900, 200);
    assert!(client.is_finalizable(&invoice_id));

    assert!(client
        .mock_auths(&[MockAuth {
            address: &payer,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "flag_dispute",
                args: (&invoice_id, &payer).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .flag_dispute(&invoice_id, &payer));
    assert!(!client.is_finalizable(&invoice_id));

    env.ledger().set_timestamp(2_000);
    assert!(!client.is_finalizable(&invoice_id));
    assert!(client.try_resolve_dispute(&invoice_id).is_err());
    assert!(!client.is_finalizable(&invoice_id));

    assert!(client
        .mock_auths(&[MockAuth {
            address: &resolver,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "resolve_dispute",
                args: (&invoice_id,).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .resolve_dispute(&invoice_id));
    assert!(client.is_finalizable(&invoice_id));
}
