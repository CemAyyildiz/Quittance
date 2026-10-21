use soroban_sdk::Env;

use super::{client, shares};
use crate::splits_are_valid;

#[test]
fn even_split_pays_both_payees() {
    let env = Env::default();
    let api = client(&env);
    let bps = shares(&env, &[5_000, 5_000]);

    assert!(api.validate_splits(&bps));
    let paid = api.apply_split(&100, &bps);

    assert_eq!(paid.get(0), Some(50));
    assert_eq!(paid.get(1), Some(50));
    assert!(splits_are_valid(&[5_000, 5_000]));
}
