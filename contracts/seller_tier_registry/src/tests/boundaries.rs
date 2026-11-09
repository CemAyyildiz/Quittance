use super::setup;
use crate::{tier_rank, Tier};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn upgrade_and_downgrade_across_all_tiers_succeeds() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    for t in [Tier::Bronze, Tier::Silver, Tier::Gold, Tier::Bronze] {
        client.set_tier(&seller, &t);
        assert_eq!(client.tier_of(&seller), t);
    }
    assert!(tier_rank(Tier::Gold) > tier_rank(Tier::Silver));
}
