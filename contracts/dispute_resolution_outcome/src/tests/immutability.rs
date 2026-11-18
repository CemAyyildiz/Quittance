use crate::{types::{DisputeError, Outcome}, DisputeResolutionOutcome, DisputeResolutionOutcomeClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_immutable_outcome_persistence_guarantee() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(DisputeResolutionOutcome, ());
    let client = DisputeResolutionOutcomeClient::new(&env, &contract_id);

    let dispute_id = symbol_short!("lock_id");

    // First write succeeds
    client.resolve(&dispute_id, &Outcome::Split);
    assert_eq!(client.outcome_of(&dispute_id), Some(Outcome::Split));

    // Subsequent modifications fail and outcome never changes
    for attempt_outcome in [Outcome::FavorPayer, Outcome::FavorSeller, Outcome::Split] {
        let err = client.try_resolve(&dispute_id, &attempt_outcome);
        assert_eq!(err.unwrap_err().unwrap(), DisputeError::AlreadyResolved);
        assert_eq!(client.outcome_of(&dispute_id), Some(Outcome::Split));
    }
}
