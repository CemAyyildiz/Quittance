use crate::{types::{DisputeError, Outcome}, DisputeResolutionOutcome, DisputeResolutionOutcomeClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_query_unresolved_dispute_returns_none() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(DisputeResolutionOutcome, ());
    let client = DisputeResolutionOutcomeClient::new(&env, &contract_id);

    let unknown_id = symbol_short!("unknown");
    assert!(!client.is_resolved(&unknown_id));
    assert_eq!(client.outcome_of(&unknown_id), None);
}

#[test]
fn test_resolving_twice_fails_with_already_resolved() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(DisputeResolutionOutcome, ());
    let client = DisputeResolutionOutcomeClient::new(&env, &contract_id);

    let disp_id = symbol_short!("double");

    client.resolve(&disp_id, &Outcome::FavorSeller);

    let res = client.try_resolve(&disp_id, &Outcome::FavorPayer);
    assert_eq!(res.unwrap_err().unwrap(), DisputeError::AlreadyResolved);
}
