use payment_split_calculator::split_amount;

#[test]
fn splits_total_evenly_across_equal_shares() {
    let shares = split_amount(10_000, &[5_000, 5_000], 0).unwrap();
    assert_eq!(shares, vec![5_000, 5_000]);
}

#[test]
fn assigns_rounding_remainder_to_designated_recipient() {
    // 100 * 3_333 / 10_000 = 33 (floor), 100 * 6_667 / 10_000 = 66 (floor).
    // Remainder 1 is assigned to recipient 1.
    let shares = split_amount(100, &[3_333, 6_667], 1).unwrap();
    assert_eq!(shares, vec![33, 67]);
}

#[test]
fn single_recipient_takes_the_whole_amount() {
    let shares = split_amount(500, &[10_000], 0).unwrap();
    assert_eq!(shares, vec![500]);
}
