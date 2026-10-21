//! Scenario tests for `fee-tier-lookup`.
//!
//! These cover behaviours specific to the "tiered fee" concept that go beyond a
//! plain lookup: the open-ended top bracket, reconfiguration, and the
//! interaction between `set_tier` (append) and `set_tiers` (replace).

mod common;

use fee_tier_lookup::{FeeTierLookup, FeeTierLookupClient, Tier};
use soroban_sdk::{testutils::Address as _, vec, Address, Env};

#[test]
fn the_highest_tier_acts_as_an_open_ended_catch_all() {
    let (_env, admin, client) = common::setup();
    // A progressive-volume fee schedule with a final "everything else" bracket.
    client.set_tier(&admin, &1_000, &100); // small payments: 1.00%
    client.set_tier(&admin, &10_000, &50); // medium: 0.50%
    client.set_tier(&admin, &i128::MAX, &20); // large: 0.20%

    assert_eq!(client.fee_bps_for(&500), 100);
    assert_eq!(client.fee_bps_for(&5_000), 50);
    assert_eq!(client.fee_bps_for(&500_000), 20);
}

#[test]
fn a_smaller_later_bracket_does_not_shadow_an_earlier_one() {
    let (env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &25);

    // Replacing the list drops the previous bracket entirely.
    client
        .set_tiers(
            &admin,
            &vec![
                &env,
                Tier { upto_amount: 500, bps: 10 },
                Tier { upto_amount: 1_500, bps: 30 },
            ],
        )
        ;

    assert_eq!(client.tiers().len(), 2);
    assert_eq!(client.fee_bps_for(&500), 10);
    assert_eq!(client.fee_bps_for(&501), 30);
}

#[test]
fn set_tier_after_set_tiers_continues_from_the_largest_bound() {
    let (env, admin, client) = common::setup();
    client
        .set_tiers(&admin, &vec![&env, Tier { upto_amount: 100, bps: 10 }])
        ;
    client.set_tier(&admin, &200, &20);

    assert_eq!(client.tiers().len(), 2);
    assert_eq!(client.fee_bps_for(&150), 20);
}

#[test]
fn reconfigure_to_a_single_tier_and_back() {
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
    assert_eq!(client.fee_bps_for(&150), 20);

    client
        .set_tiers(&admin, &vec![&env, Tier { upto_amount: 1_000, bps: 99 }])
        ;
    assert_eq!(client.fee_bps_for(&150), 99);
    assert_eq!(client.fee_bps_for(&5_000), 99);
}

#[test]
fn two_instances_keep_independent_state() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let a_id = env.register(FeeTierLookup, (&admin,));
    let b_id = env.register(FeeTierLookup, (&admin,));
    let a = FeeTierLookupClient::new(&env, &a_id);
    let b = FeeTierLookupClient::new(&env, &b_id);

    a.set_tier(&admin, &100, &11);
    b.set_tier(&admin, &100, &22);

    assert_eq!(a.fee_bps_for(&50), 11);
    assert_eq!(b.fee_bps_for(&50), 22);
    assert_eq!(a.tiers().get_unchecked(0).bps, 11);
    assert_eq!(b.tiers().get_unchecked(0).bps, 22);
}
