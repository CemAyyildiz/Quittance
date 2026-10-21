mod common;

use common::{record, setup};
use dispute_flag::{DisputeFlagClient, Error};
use soroban_sdk::testutils::Ledger as _;

#[test]
fn inclusive_deadline_allows_flag_at_exact_last_second() {
    let (env, contract_id, resolver, payer, invoice_id) = setup();
    record(&env, &contract_id, &resolver, &payer, &invoice_id, 900, 100);
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert!(client.flag_dispute(&invoice_id, &payer));
    assert!(!client.is_finalizable(&invoice_id));
}

#[test]
fn one_second_late_cannot_flag() {
    let (env, contract_id, resolver, payer, invoice_id) = setup();
    record(&env, &contract_id, &resolver, &payer, &invoice_id, 900, 100);
    env.ledger().set_timestamp(1_001);
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert_eq!(
        client.try_flag_dispute(&invoice_id, &payer),
        Err(Ok(Error::WindowClosed))
    );
    assert!(client.is_finalizable(&invoice_id));
}

#[test]
fn zero_and_overflowing_windows_are_rejected() {
    let (env, contract_id, _resolver, payer, invoice_id) = setup();
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert_eq!(
        client.try_record_payment(&invoice_id, &payer, &1_000, &0),
        Err(Ok(Error::InvalidWindow))
    );
    assert_eq!(
        client.try_record_payment(&invoice_id, &payer, &1_000, &u64::MAX),
        Err(Ok(Error::InvalidWindow))
    );
    assert!(!client.is_finalizable(&invoice_id));
}

#[test]
fn payment_at_current_ledger_second_is_valid() {
    let (env, contract_id, resolver, payer, invoice_id) = setup();
    record(&env, &contract_id, &resolver, &payer, &invoice_id, 1_000, 1);
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert!(client.flag_dispute(&invoice_id, &payer));
}
