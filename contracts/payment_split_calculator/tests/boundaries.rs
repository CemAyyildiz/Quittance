use payment_split_calculator::{split_amount, BPS_DENOMINATOR};

#[test]
fn zero_total_yields_all_zero_shares() {
    let shares = split_amount(0, &[5_000, 5_000], 1).unwrap();
    assert_eq!(shares, vec![0, 0]);
}

#[test]
fn full_share_goes_to_single_recipient() {
    let shares = split_amount(1_000_000_000, &[10_000], 0).unwrap();
    assert_eq!(shares, vec![1_000_000_000]);
}

#[test]
fn sub_whole_shares_route_remainder_to_designated_recipient() {
    // Shares sum to 5_000 bps (50%), so the remainder (50) goes to recipient 0.
    let shares = split_amount(100, &[5_000], 0).unwrap();
    assert_eq!(shares, vec![100]);
}

#[test]
fn basis_point_denominator_is_100_percent() {
    assert_eq!(BPS_DENOMINATOR, 10_000);
}
