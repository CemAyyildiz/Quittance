use confirmation_quorum::{ConfirmationQuorum, ConfirmationQuorumClient, Error};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol};

#[test]
fn every_payment_reference_keeps_its_own_quorum() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let third = Address::generate(&env);
    let invoice_a = Symbol::new(&env, "invoice_a");
    let invoice_b = Symbol::new(&env, "invoice_b");

    client.initialize(
        &admin,
        &vec![&env, first.clone(), second.clone(), third.clone()],
    );

    client.confirm(&first, &invoice_a);
    client.confirm(&second, &invoice_a);
    client.confirm(&first, &invoice_b);

    // The quorum on invoice A does not leak into invoice B.
    assert!(client.is_confirmed(&invoice_a, &2));
    assert!(!client.is_confirmed(&invoice_b, &2));
    assert_eq!(client.confirmation_count(&invoice_a), 2);
    assert_eq!(client.confirmation_count(&invoice_b), 1);
}

#[test]
fn any_subset_of_observers_can_form_the_quorum() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let third = Address::generate(&env);
    let subset_one = Symbol::new(&env, "subset_one");
    let subset_two = Symbol::new(&env, "subset_two");
    let subset_three = Symbol::new(&env, "subset_three");

    client.initialize(
        &admin,
        &vec![&env, first.clone(), second.clone(), third.clone()],
    );

    client.confirm(&first, &subset_one);
    client.confirm(&second, &subset_one);

    client.confirm(&second, &subset_two);
    client.confirm(&third, &subset_two);

    client.confirm(&first, &subset_three);
    client.confirm(&third, &subset_three);

    for reference in [subset_one, subset_two, subset_three] {
        assert!(client.is_confirmed(&reference, &2));
    }
}

#[test]
fn a_repeated_confirmation_cannot_inflate_the_count() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "inflate_ref");

    client.initialize(&admin, &vec![&env, observer.clone()]);
    client.confirm(&observer, &reference);

    assert!(client.try_confirm(&observer, &reference).is_err());
    assert_eq!(client.confirmation_count(&reference), 1);
    assert!(!client.is_confirmed(&reference, &2));
}

#[test]
fn a_quorum_is_reached_even_when_some_observers_stay_silent() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let silent = Address::generate(&env);
    let reference = Symbol::new(&env, "silent_ref");

    client.initialize(
        &admin,
        &vec![&env, first.clone(), second.clone(), silent.clone()],
    );

    client.confirm(&first, &reference);
    client.confirm(&second, &reference);

    // The silent observer does not block a quorum of two out of three.
    assert!(client.is_confirmed(&reference, &2));
    assert_eq!(client.confirmation_count(&reference), 2);
    assert!(!client.has_confirmed(&silent, &reference));
}

#[test]
fn confirming_requires_the_authorization_of_the_observer_itself() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "auth_ref");

    client.initialize(&admin, &vec![&env, observer.clone()]);
    env.set_auths(&[]);

    // Without the observer's own authorization the confirmation is rejected.
    assert!(client.try_confirm(&observer, &reference).is_err());
    assert_eq!(client.confirmation_count(&reference), 0);
}

#[test]
fn the_quorum_records_the_authorizing_observer() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "recorded_ref");

    client.initialize(&admin, &vec![&env, observer.clone()]);
    client.confirm(&observer, &reference);

    let auths = env.auths();
    assert!(!auths.is_empty());
    let confirmed_by_observer = auths.iter().any(|(address, _)| address == &observer);
    assert!(confirmed_by_observer);
}

#[test]
fn a_rejected_confirmation_leaves_the_quorum_untouched() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let outsider = Address::generate(&env);
    let reference = Symbol::new(&env, "untouched_ref");

    client.initialize(&admin, &vec![&env, observer.clone()]);
    client.confirm(&observer, &reference);

    let err = client
        .try_confirm(&outsider, &reference)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotObserver);
    assert_eq!(client.confirmation_count(&reference), 1);
    assert!(client.is_confirmed(&reference, &1));
}
