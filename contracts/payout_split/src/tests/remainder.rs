use soroban_sdk::Env;

use super::{client, shares};
use crate::apply_bps;

#[test]
fn leftover_stroop_goes_to_the_last_payee() {
    let env = Env::default();
    let api = client(&env);
    let bps = shares(&env, &[1, 9_999]);
    let paid = api.apply_split(&1, &bps);

    assert_eq!(paid.get(0), Some(0));
    assert_eq!(paid.get(1), Some(1));
}

#[test]
fn three_way_split_conserves_the_amount() {
    let plan = apply_bps(10_000, &[3_333, 3_333, 3_334]).expect("three way");
    let total = plan.shares.iter().take(plan.len).sum::<i128>();
    assert_eq!(plan.shares[0], 3_333);
    assert_eq!(plan.shares[1], 3_333);
    assert_eq!(plan.shares[2], 3_334);
    assert_eq!(total, 10_000);
}
