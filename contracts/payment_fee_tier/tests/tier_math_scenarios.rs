mod common;

use common::{sample_tiers, setup};

#[test]
fn computes_exact_fee_amount_from_matched_tier() {
    let (env, client) = setup();
    let tiers = sample_tiers(&env);

    // At volume 50_000 -> 175 bps (1.75%); payment 10_000 -> fee 175
    assert_eq!(client.compute_fee_amount(&10_000, &50_000, &tiers), 175);
    let quote = client.quote_tier(&50_000, &tiers);
    assert_eq!(quote.matched_threshold, 10_000);
    assert_eq!(quote.fee_bps, 175);
}
