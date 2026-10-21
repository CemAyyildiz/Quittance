use soroban_sdk::Env;
use crate::{CurrencyPegTolerance, CurrencyPegToleranceClient};

#[test]
#[should_panic]
fn outside_tolerance_band_panics() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    let reference = 10_000i128;
    let tolerance = 200u32; // 2%

    // 5% deviation
    assert!(!client.is_within_band(&10_500, &reference, &tolerance));
    client.check_rate(&10_500, &reference, &tolerance);
}

#[test]
#[should_panic]
fn zero_rate_panics() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    client.check_rate(&0, &100, &100);
}

#[test]
#[should_panic]
fn negative_rate_panics() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    client.check_rate(&-50, &100, &100);
}

#[test]
#[should_panic]
fn tolerance_exceeding_max_panics() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    // 10_001 bps > 10_000 (100%)
    assert!(!client.is_within_band(&100, &100, &10_001));
    client.check_rate(&100, &100, &10_001);
}
