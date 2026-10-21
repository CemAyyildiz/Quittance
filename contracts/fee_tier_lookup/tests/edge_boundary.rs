//! Edge and boundary-case tests for `fee-tier-lookup`.
//!
//! These tests exercise the exact edges of every bracket (the inclusive
//! ceiling), single-unit brackets, large values, and the `0`/`10_000`
//! basis-point bounds.

mod common;

use fee_tier_lookup::{Tier, MAX_BPS};
use soroban_sdk::vec;

#[test]
fn bracket_ceiling_is_inclusive_on_both_sides() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &100, &10);
    client.set_tier(&admin, &200, &20);

    // Exactly on the lower bracket's ceiling -> lower fee.
    assert_eq!(client.fee_bps_for(&100), 10);
    // The very next unit -> upper fee.
    assert_eq!(client.fee_bps_for(&101), 20);
    // Exactly on the upper bracket's ceiling -> upper fee.
    assert_eq!(client.fee_bps_for(&200), 20);
}

#[test]
fn single_unit_bracket() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1, &10);
    client.set_tier(&admin, &1_000, &20);

    assert_eq!(client.fee_bps_for(&1), 10);
    assert_eq!(client.fee_bps_for(&2), 20);
}

#[test]
fn amount_of_exactly_one_resolves_to_first_bracket() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &50);

    assert_eq!(client.fee_bps_for(&1), 50);
}

#[test]
fn very_large_amount_uses_top_bracket() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &(i128::MAX - 1), &100);

    assert_eq!(client.fee_bps_for(&i128::MAX), 100);
}

#[test]
fn very_large_bounds_are_accepted() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &10);
    client.set_tier(&admin, &i128::MAX, &20);

    assert_eq!(client.tiers().len(), 2);
    assert_eq!(client.fee_bps_for(&i128::MAX), 20);
}

#[test]
fn minimum_basis_points_boundary() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &0);

    assert_eq!(client.fee_bps_for(&1), 0);
    assert_eq!(client.fee_bps_for(&1_000), 0);
}

#[test]
fn maximum_basis_points_boundary_matches_the_constant() {
    let (_env, admin, client) = common::setup();
    assert_eq!(MAX_BPS, 10_000);

    client.set_tier(&admin, &1_000, &MAX_BPS);
    assert_eq!(client.fee_bps_for(&500), MAX_BPS);
}

#[test]
fn set_tiers_accepts_a_single_bracket() {
    let (env, admin, client) = common::setup();
    client
        .set_tiers(&admin, &vec![&env, Tier { upto_amount: 500, bps: 33 }])
        ;

    assert_eq!(client.fee_bps_for(&500), 33);
    assert_eq!(client.fee_bps_for(&501), 33);
}

#[test]
fn many_tiers_all_resolve_correctly() {
    let (env, admin, client) = common::setup();
    client
        .set_tiers(
            &admin,
            &vec![
                &env,
                Tier { upto_amount: 100, bps: 1 },
                Tier { upto_amount: 1_000, bps: 2 },
                Tier { upto_amount: 10_000, bps: 3 },
                Tier { upto_amount: 100_000, bps: 4 },
                Tier { upto_amount: 1_000_000, bps: 5 },
            ],
        )
        ;

    assert_eq!(client.fee_bps_for(&100), 1);
    assert_eq!(client.fee_bps_for(&101), 2);
    assert_eq!(client.fee_bps_for(&10_000), 3);
    assert_eq!(client.fee_bps_for(&100_000), 4);
    assert_eq!(client.fee_bps_for(&1_000_000), 5);
    assert_eq!(client.fee_bps_for(&5_000_000), 5);
}
