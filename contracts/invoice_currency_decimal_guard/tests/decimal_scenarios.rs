mod common;

use invoice_currency_decimal_guard::DecimalGuardError;
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct MockSep41Token;

#[contractimpl]
impl MockSep41Token {
    pub fn decimals(_env: Env, configured: u32) -> u32 {
        configured
    }
}

#[test]
fn multi_asset_invoice_verification_flow() {
    let (env, guard) = common::setup();
    let token_id = env.register(MockSep41Token, ());
    let token = MockSep41TokenClient::new(&env, &token_id);

    // Stellar SAC USDC (7 decimals) matches a 7-decimal invoice quote
    let sac_decimals = token.decimals(&7);
    assert!(guard.matches_expected_decimals(&sac_decimals, &7));
    guard.require_expected_decimals(&sac_decimals, &7);

    // Bridged 6-decimal USDC presented against a 7-decimal invoice quote is rejected
    let bridged_usdc_decimals = token.decimals(&6);
    assert!(!guard.matches_expected_decimals(&bridged_usdc_decimals, &7));
    assert_eq!(
        guard.try_require_expected_decimals(&bridged_usdc_decimals, &7),
        Err(Ok(DecimalGuardError::DecimalsMismatch))
    );

    // 18-decimal wrapped asset matches an 18-decimal invoice quote, fails against 7
    let weth_decimals = token.decimals(&18);
    assert!(!guard.matches_expected_decimals(&weth_decimals, &7));
    assert!(guard.matches_expected_decimals(&weth_decimals, &18));
    guard.require_expected_decimals(&weth_decimals, &18);
}
