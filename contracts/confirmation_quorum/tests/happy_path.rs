use confirmation_quorum::{ConfirmationQuorum, ConfirmationQuorumClient};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol};

#[test]
fn two_of_three_observers_reach_the_quorum() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let third = Address::generate(&env);
    let reference = Symbol::new(&env, "payment_ref_1");

    client.initialize(
        &admin,
        &vec![&env, first.clone(), second.clone(), third.clone()],
    );

    client.confirm(&first, &reference);
    assert!(!client.is_confirmed(&reference, &2));
    assert_eq!(client.confirmation_count(&reference), 1);

    client.confirm(&second, &reference);
    assert!(client.is_confirmed(&reference, &2));
    assert!(!client.is_confirmed(&reference, &3));
    assert_eq!(client.confirmation_count(&reference), 2);
}

#[test]
fn every_observer_confirming_satisfies_the_full_quorum() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let third = Address::generate(&env);
    let reference = Symbol::new(&env, "payment_ref_2");

    client.initialize(
        &admin,
        &vec![&env, first.clone(), second.clone(), third.clone()],
    );

    client.confirm(&first, &reference);
    client.confirm(&second, &reference);
    client.confirm(&third, &reference);

    assert!(client.is_confirmed(&reference, &3));
    assert_eq!(client.confirmation_count(&reference), 3);
    assert_eq!(client.confirmations_needed(&reference, &3), 0);
}

#[test]
fn a_single_observer_can_be_the_whole_quorum() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let only = Address::generate(&env);
    let reference = Symbol::new(&env, "payment_ref_3");

    client.initialize(&admin, &vec![&env, only.clone()]);
    client.confirm(&only, &reference);

    assert!(client.is_confirmed(&reference, &1));
    assert_eq!(client.confirmation_count(&reference), 1);
}

#[test]
fn a_confirmed_reference_reports_the_confirming_observers() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let reference = Symbol::new(&env, "payment_ref_4");

    client.initialize(&admin, &vec![&env, first.clone(), second.clone()]);
    client.confirm(&first, &reference);

    assert!(client.has_confirmed(&first, &reference));
    assert!(!client.has_confirmed(&second, &reference));
}
