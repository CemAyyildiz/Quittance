use super::setup;
use crate::Error;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn assigned_tier_of_returns_not_assigned_for_unknown_seller() {
    let (env, client) = setup();
    let unknown = Address::generate(&env);
    assert_eq!(
        client.try_assigned_tier_of(&unknown),
        Err(Ok(Error::NotAssigned))
    );
}
