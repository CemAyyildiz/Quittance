//! Path-payment FX conversion rounding scenarios for `payment-amount-tolerance`.

use super::setup;

#[test]
fn path_payment_rounding_residuals_pass_while_meaningful_underpayment_is_blocked() {
    let (_env, client) = setup();
    // Invoice for 250.00 USDC (2_500_000_000 stroops) with 100-stroop (0.00001 USDC) rounding tolerance
    let invoice_amount = 2_500_000_000_i128;
    let rounding_tolerance = 100_i128;

    // 3-stroop DEX path-payment rounding residual passes:
    assert!(client.is_within_tolerance(
        &invoice_amount,
        &(invoice_amount - 3),
        &rounding_tolerance
    ));

    // Payer attempting to underpay by 1 USDC (10_000_000 stroops) is rejected:
    assert!(!client.is_within_tolerance(
        &invoice_amount,
        &(invoice_amount - 10_000_000),
        &rounding_tolerance
    ));
}
