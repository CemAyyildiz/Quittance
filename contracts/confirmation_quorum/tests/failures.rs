use confirmation_quorum::{ConfirmationQuorum, ConfirmationQuorumClient, Error};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol};

#[test]
fn the_quorum_cannot_be_configured_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);

    client.initialize(&admin, &vec![&env, first.clone()]);

    let err = client
        .try_initialize(&admin, &vec![&env, first.clone(), second.clone()])
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyInitialized);
}

#[test]
fn an_empty_observer_set_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    let err = client
        .try_initialize(&admin, &vec![&env])
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EmptyObserverSet);
}

#[test]
fn a_duplicated_observer_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);

    let err = client
        .try_initialize(&admin, &vec![&env, observer.clone(), observer.clone()])
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::DuplicateObserver);
}

#[test]
fn an_observer_set_larger_than_the_maximum_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observers: std::vec::Vec<Address> = (0..=confirmation_quorum::MAX_OBSERVERS)
        .map(|_| Address::generate(&env))
        .collect();
    let observers = soroban_sdk::Vec::from_slice(&env, &observers);

    let err = client
        .try_initialize(&admin, &observers)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::TooManyObservers);
}

#[test]
fn an_address_outside_the_observer_set_cannot_confirm() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let outsider = Address::generate(&env);
    let reference = Symbol::new(&env, "fail_ref_1");

    client.initialize(&admin, &vec![&env, observer.clone()]);

    let err = client
        .try_confirm(&outsider, &reference)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotObserver);
    assert_eq!(client.confirmation_count(&reference), 0);
}

#[test]
fn an_observer_cannot_confirm_the_same_reference_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "fail_ref_2");

    client.initialize(&admin, &vec![&env, observer.clone()]);
    client.confirm(&observer, &reference);

    let err = client
        .try_confirm(&observer, &reference)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyConfirmed);
    assert_eq!(client.confirmation_count(&reference), 1);
}

#[test]
fn a_confirmation_before_initialization_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "fail_ref_3");

    let err = client
        .try_confirm(&observer, &reference)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotInitialized);
}

#[test]
fn configuring_the_quorum_requires_the_admin_authorization() {
    let env = Env::default();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);

    assert!(client
        .try_initialize(&admin, &vec![&env, observer.clone()])
        .is_err());
    assert_eq!(client.observer_count(), 0);
}

#[test]
fn confirming_requires_the_observer_authorization() {
    let env = Env::default();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "fail_ref_4");

    env.mock_all_auths();
    client.initialize(&admin, &vec![&env, observer.clone()]);
    env.set_auths(&[]);

    assert!(client.try_confirm(&observer, &reference).is_err());
    assert_eq!(client.confirmation_count(&reference), 0);
}
