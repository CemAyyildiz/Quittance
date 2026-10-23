use payment_split_calculator::split_amount;

#[test]
fn parts_always_sum_exactly_to_the_total() {
    const CASES: &[(i128, &[u32], u32)] = &[
        (10_000, &[5_000, 5_000], 0),
        (100, &[3_333, 6_667], 1),
        (7, &[1, 1, 1], 2),
        (1_000, &[333, 333, 334], 2),
        (9_999, &[3_333, 3_333, 3_334], 1),
    ];

    for (total, shares, remainder_index) in CASES {
        let parts = split_amount(*total, shares, *remainder_index).unwrap();
        let sum: i128 = parts.iter().sum();
        assert_eq!(sum, *total, "split must conserve the total");
    }
}

#[test]
fn maximum_total_single_recipient_is_exact() {
    let shares = split_amount(i128::MAX, &[10_000], 0).unwrap();
    assert_eq!(shares.len(), 1);
    assert_eq!(shares[0], i128::MAX);
}

#[test]
fn remainder_lands_in_designated_recipient() {
    // Floors drop the sub-unit; the remainder must land on the designated peer.
    let shares = split_amount(100, &[1, 1, 1], 2).unwrap();
    assert_eq!(shares, vec![0, 0, 100]);
}
