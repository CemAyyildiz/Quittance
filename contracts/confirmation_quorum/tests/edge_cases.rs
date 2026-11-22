use confirmation_quorum::{ConfirmationQuorum, ConfirmationQuorumClient};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol};

#[test]
fn a_zero_threshold_is_trivially_satisfied() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let reference = Symbol::new(&env, "edge_ref_1");

    client.initialize(&admin, &vec![&env, observer.clone()]);

    // Nobody confirmed yet, but a quorum of zero is trivially reached.
    assert!(client.is_confirmed(&reference, &0));
    assert_eq!(client.confirmation_count(&reference), 0);
    assert_eq!(client.confirmations_needed(&reference, &0), 0);
}

#[test]
fn a_threshold_above_the_observer_count_can_never_be_reached() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let reference = Symbol::new(&env, "edge_ref_2");

    client.initialize(&admin, &vec![&env, first.clone(), second.clone()]);
    client.confirm(&first, &reference);
    client.confirm(&second, &reference);

    // Only two observers exist, so a quorum of three is unreachable.
    assert!(!client.is_confirmed(&reference, &3));
    assert_eq!(client.confirmation_count(&reference), 2);
    assert_eq!(client.confirmations_needed(&reference, &3), 1);
}

#[test]
fn the_threshold_is_inclusive() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let reference = Symbol::new(&env, "edge_ref_3");

    client.initialize(&admin, &vec![&env, first.clone(), second.clone()]);

    client.confirm(&first, &reference);
    assert!(!client.is_confirmed(&reference, &2));
    assert_eq!(client.confirmations_needed(&reference, &2), 1);

    // Exactly two confirmations satisfy a quorum of two.
    client.confirm(&second, &reference);
    assert!(client.is_confirmed(&reference, &2));
    assert_eq!(client.confirmations_needed(&reference, &2), 0);
}

#[test]
fn an_unknown_reference_has_no_confirmations() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let observer = Address::generate(&env);
    let known = Symbol::new(&env, "edge_ref_4");
    let unknown = Symbol::new(&env, "edge_ref_5");

    client.initialize(&admin, &vec![&env, observer.clone()]);
    client.confirm(&observer, &known);

    assert_eq!(client.confirmation_count(&unknown), 0);
    assert!(!client.is_confirmed(&unknown, &1));
    assert!(!client.has_confirmed(&observer, &unknown));
}

#[test]
fn confirming_one_reference_leaves_the_others_untouched() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let confirmed_ref = Symbol::new(&env, "edge_ref_6");
    let pending_ref = Symbol::new(&env, "edge_ref_7");

    client.initialize(&admin, &vec![&env, first.clone(), second.clone()]);
    client.confirm(&first, &confirmed_ref);
    client.confirm(&second, &pending_ref);

    assert_eq!(client.confirmation_count(&confirmed_ref), 1);
    assert_eq!(client.confirmation_count(&pending_ref), 1);
    assert!(!client.is_confirmed(&confirmed_ref, &2));
    assert!(!client.is_confirmed(&pending_ref, &2));
}

#[test]
fn an_uninitialized_quorum_has_no_observers() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ConfirmationQuorum, ());
    let client = ConfirmationQuorumClient::new(&env, &contract_id);

    assert_eq!(client.observer_count(), 0);
    assert_eq!(client.observers(), vec![&env]);
    assert_eq!(client.admin(), None);
}
