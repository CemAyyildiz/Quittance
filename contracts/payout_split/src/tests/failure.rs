use soroban_sdk::Env;

use super::{client, shares};
use crate::{apply_bps, validate_bps, SplitError};

#[test]
fn empty_and_unbalanced_shares_are_rejected() {
    let env = Env::default();
    let api = client(&env);

    assert!(!api.validate_splits(&shares(&env, &[])));
    assert!(!api.validate_splits(&shares(&env, &[9_999])));
    assert!(!api.validate_splits(&shares(&env, &[10_001])));
    assert_eq!(validate_bps(&[]), Err(SplitError::Empty));
    assert_eq!(validate_bps(&[9_999]), Err(SplitError::SumNotExact));
}

#[test]
fn nine_payees_exceed_the_cap() {
    let bps = [1_u32; 9];
    assert_eq!(validate_bps(&bps), Err(SplitError::TooManyPayees));
}

#[test]
#[should_panic]
fn negative_amount_panics() {
    let env = Env::default();
    let api = client(&env);
    api.apply_split(&-5, &shares(&env, &[10_000]));
}

#[test]
fn negative_amount_is_an_error_for_the_pure_helper() {
    assert_eq!(
        apply_bps(-1, &[10_000]),
        Err(SplitError::NegativeAmount)
    );
}
