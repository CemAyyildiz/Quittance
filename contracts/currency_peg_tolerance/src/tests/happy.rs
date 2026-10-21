use soroban_sdk::Env;
use crate::{CurrencyPegTolerance, CurrencyPegToleranceClient};

#[test]
fn rate_within_tolerance_band_passes() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    // Reference rate = 1.0000000 (10_000_000 stroops/units), tolerance = 100 bps (1%)
    let reference = 10_000_000i128;
    let tolerance = 100u32; // 1%

    // 0.5% above: 10_050_000
    assert!(client.is_within_band(&10_050_000, &reference, &tolerance));
    client.check_rate(&10_050_000, &reference, &tolerance);

    // 0.8% below: 9_920_000
    assert!(client.is_within_band(&9_920_000, &reference, &tolerance));
    client.check_rate(&9_920_000, &reference, &tolerance);

    // Identical rate
    assert!(client.is_within_band(&reference, &reference, &tolerance));
    client.check_rate(&reference, &reference, &tolerance);
}
