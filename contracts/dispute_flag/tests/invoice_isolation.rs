mod common;

use common::{record, setup};
use dispute_flag::DisputeFlagClient;
use soroban_sdk::Symbol;

#[test]
fn dispute_on_one_invoice_does_not_block_another() {
    let (env, contract_id, resolver, payer, first) = setup();
    let second = Symbol::new(&env, "invoice_2");
    record(&env, &contract_id, &resolver, &payer, &first, 900, 200);
    record(&env, &contract_id, &resolver, &payer, &second, 900, 200);
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);

    assert!(client.flag_dispute(&first, &payer));
    assert!(!client.is_finalizable(&first));
    assert!(client.is_finalizable(&second));

    assert!(client.resolve_dispute(&first));
    assert!(client.is_finalizable(&first));
    assert!(client.is_finalizable(&second));
}
