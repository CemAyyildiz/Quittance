use soroban_sdk::Env;
use crate::{CurrencyPegTolerance, CurrencyPegToleranceClient};

#[test]
fn stablecoin_fx_conversion_pipeline() {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);

    // USDC/USDT 1:1 reference rate with 50 bps (0.5%) tolerance band
    let usdc_peg_ref = 1_000_000i128; // $1.000000
    let fx_tolerance = 50u32; // 0.5% band: [0.995000, 1.005000]

    let quoted_quote_1 = 998_000i128; // $0.998000 -> OK
    let quoted_quote_2 = 1_004_500i128; // $1.004500 -> OK
    let quoted_flash_crash = 980_000i128; // $0.980000 -> Outside band!

    assert!(client.is_within_band(&quoted_quote_1, &usdc_peg_ref, &fx_tolerance));
    assert!(client.is_within_band(&quoted_quote_2, &usdc_peg_ref, &fx_tolerance));
    assert!(!client.is_within_band(&quoted_flash_crash, &usdc_peg_ref, &fx_tolerance));
}
