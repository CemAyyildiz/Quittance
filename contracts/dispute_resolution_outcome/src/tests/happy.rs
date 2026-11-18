use crate::{types::Outcome, DisputeResolutionOutcome, DisputeResolutionOutcomeClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_happy_path_resolution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(DisputeResolutionOutcome, ());
    let client = DisputeResolutionOutcomeClient::new(&env, &contract_id);

    let disp_1 = symbol_short!("disp_1");
    let disp_2 = symbol_short!("disp_2");
    let disp_3 = symbol_short!("disp_3");

    assert!(!client.is_resolved(&disp_1));
    assert_eq!(client.outcome_of(&disp_1), None);

    client.resolve(&disp_1, &Outcome::FavorPayer);
    assert!(client.is_resolved(&disp_1));
    assert_eq!(client.outcome_of(&disp_1), Some(Outcome::FavorPayer));

    client.resolve(&disp_2, &Outcome::FavorSeller);
    assert_eq!(client.outcome_of(&disp_2), Some(Outcome::FavorSeller));

    client.resolve(&disp_3, &Outcome::Split);
    assert_eq!(client.outcome_of(&disp_3), Some(Outcome::Split));
}
