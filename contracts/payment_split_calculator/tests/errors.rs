use payment_split_calculator::{split_amount, SplitError};

#[test]
fn rejects_negative_total() {
    let err = split_amount(-1, &[5_000], 0).unwrap_err();
    assert_eq!(err, SplitError::NegativeTotal);
}

#[test]
fn rejects_empty_shares_list() {
    let err = split_amount(100, &[], 0).unwrap_err();
    assert_eq!(err, SplitError::EmptyShares);
}

#[test]
fn rejects_shares_exceeding_whole_amount() {
    // 6_000 + 6_000 bps = 120%, which can never be honored.
    let err = split_amount(100, &[6_000, 6_000], 0).unwrap_err();
    assert_eq!(err, SplitError::SharesExceedWhole);
}

#[test]
fn rejects_out_of_bounds_remainder_index() {
    let err = split_amount(100, &[5_000], 1).unwrap_err();
    assert_eq!(err, SplitError::InvalidRemainderIndex);
}
