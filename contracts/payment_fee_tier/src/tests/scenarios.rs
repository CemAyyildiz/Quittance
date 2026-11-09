//! Progressive seller volume growth scenarios for `payment-fee-tier`.

use super::{setup, standard_tiers};

#[test]
fn seller_volume_progression_across_invoices_reduces_effective_fee() {
    let (env, client) = setup();
    let tiers = standard_tiers(&env);

    let mut cumulative_volume = 0_i128;
    let invoice_amounts = [8_000_i128, 15_000, 40_000, 200_000];
    let expected_bps = [100_u32, 100, 75, 50];

    for (invoice, expected) in invoice_amounts.iter().zip(expected_bps.iter()) {
        let bps = client.fee_bps_for_volume(&cumulative_volume, &tiers);
        assert_eq!(bps, *expected);
        cumulative_volume += invoice;
    }
    // After 263,000 total volume, seller is in the top 25 bps tier
    assert_eq!(client.fee_bps_for_volume(&cumulative_volume, &tiers), 25);
}
