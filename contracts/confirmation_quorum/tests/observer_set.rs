use confirmation_quorum::{ConfirmationQuorum, ConfirmationQuorumClient, Error, MAX_OBSERVERS};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol};

#[test]
fn the_configured_observer_set_is_readable() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);

    client.initialize(&admin, &vec![&env, first.clone(), second.clone()]);

    assert_eq!(client.observer_count(), 2);
    assert_eq!(
        client.observers(),
        vec![&env, first.clone(), second.clone()]
    );
    assert!(client.is_observer(&first));
    assert!(client.is_observer(&second));
    assert_eq!(client.admin(), Some(admin));
}

#[test]
fn an_address_outside_the_observer_set_is_not_an_observer() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let outsider = Address::generate(&env);

    client.initialize(&admin, &vec![&env, observer.clone()]);

    assert!(client.is_observer(&observer));
    assert!(!client.is_observer(&outsider));
}

#[test]
fn the_largest_supported_observer_set_is_accepted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observers: std::vec::Vec<Address> = (0..MAX_OBSERVERS)
        .map(|_| Address::generate(&env))
        .collect();
    let observers = soroban_sdk::Vec::from_slice(&env, &observers);

    client.initialize(&admin, &observers);

    assert_eq!(client.observer_count(), MAX_OBSERVERS);
}

#[test]
fn the_observer_set_cannot_be_replaced() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let replacement = Address::generate(&env);
    let reference = Symbol::new(&env, "set_ref");

    client.initialize(&admin, &vec![&env, first.clone(), second.clone()]);

    let err = client
        .try_initialize(&admin, &vec![&env, replacement.clone()])
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyInitialized);

    // The original observer set is still the one in charge.
    assert_eq!(
        client.observers(),
        vec![&env, first.clone(), second.clone()]
    );
    assert!(client.is_observer(&first));
    assert!(!client.is_observer(&replacement));

    let err = client
        .try_confirm(&replacement, &reference)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotObserver);
}
