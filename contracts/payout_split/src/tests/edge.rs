use soroban_sdk::Env;

use super::{client, shares};
use crate::{apply_bps, MAX_PAYEES};

#[test]
fn single_payee_takes_the_whole_amount() {
    let env = Env::default();
    let api = client(&env);
    let bps = shares(&env, &[10_000]);

    assert!(api.validate_splits(&bps));
    let paid = api.apply_split(&1, &bps);
    assert_eq!(paid.len(), 1);
    assert_eq!(paid.get(0), Some(1));
}

#[test]
fn eight_payees_is_the_upper_bound() {
    let bps = [1_250_u32; MAX_PAYEES];
    let plan = apply_bps(8_000, &bps).expect("full roster");
    assert_eq!(plan.len, MAX_PAYEES);
    assert_eq!(plan.shares.iter().take(plan.len).sum::<i128>(), 8_000);
}

#[test]
fn zero_amount_stays_zero() {
    let plan = apply_bps(0, &[2_500, 7_500]).expect("zero");
    assert_eq!(plan.shares[0], 0);
    assert_eq!(plan.shares[1], 0);
}
