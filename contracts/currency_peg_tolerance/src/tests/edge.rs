use soroban_sdk::Env;
use crate::{CurrencyPegTolerance, CurrencyPegToleranceClient};

#[test]
fn exact_band_boundaries() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    let reference = 10_000i128;
    let tolerance = 500u32; // 5% = 500 bps

    // Exactly 5% above: 10_500
    assert!(client.is_within_band(&10_500, &reference, &tolerance));
    client.check_rate(&10_500, &reference, &tolerance);

    // Exactly 5% below: 9_500
    assert!(client.is_within_band(&9_500, &reference, &tolerance));
    client.check_rate(&9_500, &reference, &tolerance);

    // 1 unit outside upper: 10_501
    assert!(!client.is_within_band(&10_501, &reference, &tolerance));

    // 1 unit outside lower: 9_499
    assert!(!client.is_within_band(&9_499, &reference, &tolerance));
}

#[test]
fn zero_tolerance_requires_exact_match() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    let reference = 50_000i128;
    assert!(client.is_within_band(&50_000, &reference, &0));
    assert!(!client.is_within_band(&50_001, &reference, &0));
}
