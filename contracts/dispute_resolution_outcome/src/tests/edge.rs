use crate::{types::Outcome, DisputeResolutionOutcome, DisputeResolutionOutcomeClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_multiple_disputes_independent_isolation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(DisputeResolutionOutcome, ());
    let client = DisputeResolutionOutcomeClient::new(&env, &contract_id);

    let disp_a = symbol_short!("disp_a");
    let disp_b = symbol_short!("disp_b");

    client.resolve(&disp_a, &Outcome::FavorPayer);
    assert!(client.is_resolved(&disp_a));
    assert!(!client.is_resolved(&disp_b));

    client.resolve(&disp_b, &Outcome::Split);
    assert_eq!(client.outcome_of(&disp_a), Some(Outcome::FavorPayer));
    assert_eq!(client.outcome_of(&disp_b), Some(Outcome::Split));
}
