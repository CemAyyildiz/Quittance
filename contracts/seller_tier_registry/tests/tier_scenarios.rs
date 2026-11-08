mod common;

use common::setup;
use seller_tier_registry::{tier_fee_discount_bps, tier_rank, Tier};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn evaluates_minimum_tier_and_discounts() {
    let (env, client, _) = setup();
    let seller = Address::generate(&env);

    client.set_tier(&seller, &Tier::Silver);
    assert!(client.seller_meets_tier(&seller, &Tier::Bronze));
    assert!(client.seller_meets_tier(&seller, &Tier::Silver));
    assert!(!client.seller_meets_tier(&seller, &Tier::Gold));

    assert_eq!(tier_rank(Tier::Bronze), 1);
    assert_eq!(tier_rank(Tier::Silver), 2);
    assert_eq!(tier_rank(Tier::Gold), 3);

    assert_eq!(tier_fee_discount_bps(Tier::Bronze), 0);
    assert_eq!(tier_fee_discount_bps(Tier::Silver), 100);
    assert_eq!(tier_fee_discount_bps(Tier::Gold), 250);
}
