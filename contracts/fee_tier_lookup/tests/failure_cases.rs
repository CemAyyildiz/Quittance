//! Failure and error-case tests for `fee-tier-lookup`.
//!
//! These tests cover every way configuration and lookup can fail, ensuring each
//! [`fee_tier_lookup::TierError`] variant is reachable and that the contract
//! never silently accepts malformed state.

mod common;

use fee_tier_lookup::{FeeTierLookup, FeeTierLookupClient, Tier, TierError};
use soroban_sdk::{testutils::Address as _, vec, Address, Env};

#[test]
fn fee_lookup_before_configuration_fails() {
    let (_env, _admin, client) = common::setup();

    assert_eq!(
        client.try_fee_bps_for(&100),
        Err(Ok(TierError::NoTiersConfigured))
    );
}

#[test]
fn non_positive_amount_fails() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &50);

    assert_eq!(client.try_fee_bps_for(&0), Err(Ok(TierError::InvalidBound)));
    assert_eq!(client.try_fee_bps_for(&-1), Err(Ok(TierError::InvalidBound)));
}

#[test]
fn fee_over_one_hundred_percent_is_rejected() {
    let (_env, admin, client) = common::setup();

    assert_eq!(
        client.try_set_tier(&admin, &1_000, &10_001),
        Err(Ok(TierError::InvalidBps))
    );
}

#[test]
fn non_positive_bound_is_rejected() {
    let (_env, admin, client) = common::setup();

    assert_eq!(
        client.try_set_tier(&admin, &0, &50),
        Err(Ok(TierError::InvalidBound))
    );
    assert_eq!(
        client.try_set_tier(&admin, &-5, &50),
        Err(Ok(TierError::InvalidBound))
    );
}

#[test]
fn duplicate_or_descending_bound_is_rejected() {
    let (_env, admin, client) = common::setup();
    client.set_tier(&admin, &1_000, &50);

    assert_eq!(
        client.try_set_tier(&admin, &1_000, &60),
        Err(Ok(TierError::InvalidBound))
    );
    assert_eq!(
        client.try_set_tier(&admin, &500, &60),
        Err(Ok(TierError::InvalidBound))
    );
}

#[test]
fn a_stranger_cannot_set_a_tier() {
    let (env, _admin, client) = common::setup();
    let stranger = Address::generate(&env);

    assert_eq!(
        client.try_set_tier(&stranger, &1_000, &50),
        Err(Ok(TierError::NotAuthorised))
    );
}

#[test]
fn set_tiers_rejects_overlapping_bounds() {
    let (env, admin, client) = common::setup();

    let result = client.try_set_tiers(
        &admin,
        &vec![
            &env,
            Tier { upto_amount: 100, bps: 10 },
            Tier { upto_amount: 100, bps: 20 },
        ],
    );
    assert_eq!(result, Err(Ok(TierError::InvalidBound)));
}

#[test]
fn set_tiers_rejects_out_of_range_bps() {
    let (env, admin, client) = common::setup();

    let result =
        client.try_set_tiers(&admin, &vec![&env, Tier { upto_amount: 100, bps: 10_001 }]);
    assert_eq!(result, Err(Ok(TierError::InvalidBps)));
}

#[test]
fn a_second_unrelated_address_cannot_configure() {
    // The constructor fixes the admin at deploy time; any other address is
    // rejected, proving configuration is bound to the deployer and not open.
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(FeeTierLookup, (&admin,));
    let client = FeeTierLookupClient::new(&env, &contract_id);
    let caller = Address::generate(&env);

    assert_eq!(
        client.try_set_tier(&caller, &1_000, &50),
        Err(Ok(TierError::NotAuthorised))
    );
    assert_eq!(client.admin(), admin);
}

#[test]
fn error_messages_are_stable() {
    assert_eq!(
        TierError::NotAuthorised.message(),
        "Caller is not the fee admin."
    );
    assert_eq!(
        TierError::InvalidBps.message(),
        "Basis points must be between 0 and 10000."
    );
    assert_eq!(
        TierError::InvalidBound.message(),
        "Tier bounds must be positive and strictly increasing."
    );
    assert_eq!(
        TierError::NoTiersConfigured.message(),
        "No fee tiers have been configured."
    );
}
