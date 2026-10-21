mod common;

use common::{record, setup};
use dispute_flag::{DisputeFlagClient, Error};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn unknown_invoice_and_future_payment_are_rejected() {
    let (env, contract_id, _resolver, payer, invoice_id) = setup();
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert_eq!(
        client.try_flag_dispute(&invoice_id, &payer),
        Err(Ok(Error::PaymentNotFound))
    );
    assert_eq!(
        client.try_record_payment(&invoice_id, &payer, &1_001, &10),
        Err(Ok(Error::FuturePayment))
    );
}

#[test]
fn only_recorded_payer_can_flag_and_repeated_actions_fail() {
    let (env, contract_id, resolver, payer, invoice_id) = setup();
    record(&env, &contract_id, &resolver, &payer, &invoice_id, 990, 20);
    env.mock_all_auths();
    let client = DisputeFlagClient::new(&env, &contract_id);
    let stranger = Address::generate(&env);
    assert_eq!(
        client.try_flag_dispute(&invoice_id, &stranger),
        Err(Ok(Error::WrongPayer))
    );
    assert_eq!(
        client.try_record_payment(&invoice_id, &payer, &990, &20),
        Err(Ok(Error::AlreadyRecorded))
    );
    assert_eq!(
        client.try_resolve_dispute(&invoice_id),
        Err(Ok(Error::NotDisputed))
    );
    assert!(client.flag_dispute(&invoice_id, &payer));
    assert_eq!(
        client.try_flag_dispute(&invoice_id, &payer),
        Err(Ok(Error::AlreadyDisputed))
    );
    assert!(client.resolve_dispute(&invoice_id));
    assert_eq!(
        client.try_resolve_dispute(&invoice_id),
        Err(Ok(Error::AlreadyResolved))
    );
    assert_eq!(
        client.try_flag_dispute(&invoice_id, &payer),
        Err(Ok(Error::AlreadyResolved))
    );
}

#[test]
fn mutations_need_signer_authorization() {
    let (env, contract_id, resolver, payer, invoice_id) = setup();
    let client = DisputeFlagClient::new(&env, &contract_id);
    assert!(client
        .try_record_payment(&invoice_id, &payer, &990, &20)
        .is_err());

    record(&env, &contract_id, &resolver, &payer, &invoice_id, 990, 20);
    assert!(client.try_flag_dispute(&invoice_id, &payer).is_err());
    assert!(client.is_finalizable(&invoice_id));

    // Resolver authorization cannot stand in for payer authorization.
    assert!(client.try_resolve_dispute(&invoice_id).is_err());
}
