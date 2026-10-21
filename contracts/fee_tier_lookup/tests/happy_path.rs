//! Happy-path tests for `fee-tier-lookup`.
//!
//! These tests cover the successful configuration and lookup scenarios where
//! the admin sets well-formed brackets and every amount resolves to the
//! expected fee.

mod common;

use fee_tier_lookup::Tier;
use soroban_sdk::vec;

#[test]
fn constructor_stores_the_admin_and_empty_tiers() {
    let (_env, admin, client) = common::setup();

    assert_eq!(client.admin(), admin);
    assert_eq!(client.tiers().len(), 0);
}

#[test]
fn single_tier_applies_to_every_amount_below_its_ceiling() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &50);

    assert_eq!(client.fee_bps_for(&1), 50);
    assert_eq!(client.fee_bps_for(&999), 50);
    assert_eq!(client.fee_bps_for(&1_000), 50);
}

#[test]
fn amounts_resolve_to_the_first_bracket_that_fits() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &50);
    client.set_tier(&admin, &10_000, &100);
    client.set_tier(&admin, &100_000, &250);

    assert_eq!(client.fee_bps_for(&500), 50);
    assert_eq!(client.fee_bps_for(&1_000), 50);
    assert_eq!(client.fee_bps_for(&1_001), 100);
    assert_eq!(client.fee_bps_for(&10_000), 100);
    assert_eq!(client.fee_bps_for(&10_001), 250);
    assert_eq!(client.fee_bps_for(&100_000), 250);
}

#[test]
fn amount_above_the_top_bracket_uses_the_highest_tier_fee() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &50);
    client.set_tier(&admin, &10_000, &100);

    assert_eq!(client.fee_bps_for(&1_000_000), 100);
}

#[test]
fn zero_fee_tier_is_allowed() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &0);

    assert_eq!(client.fee_bps_for(&500), 0);
}

#[test]
fn maximum_fee_tier_is_allowed() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &10_000);

    assert_eq!(client.fee_bps_for(&500), 10_000);
}

#[test]
fn set_tiers_replaces_the_whole_list_at_once() {
    let (env, admin, client) = common::setup();

    client
        .set_tiers(
            &admin,
            &vec![
                &env,
                Tier { upto_amount: 100, bps: 10 },
                Tier { upto_amount: 200, bps: 20 },
            ],
        )
        ;

    assert_eq!(client.tiers().len(), 2);
    assert_eq!(client.fee_bps_for(&50), 10);
    assert_eq!(client.fee_bps_for(&150), 20);
}

#[test]
fn set_tier_appends_in_ascending_order() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &100, &10);
    client.set_tier(&admin, &200, &20);
    client.set_tier(&admin, &300, &30);

    let tiers = client.tiers();
    assert_eq!(tiers.len(), 3);
    assert_eq!(tiers.get_unchecked(0).upto_amount, 100);
    assert_eq!(tiers.get_unchecked(1).upto_amount, 200);
    assert_eq!(tiers.get_unchecked(2).upto_amount, 300);
}
