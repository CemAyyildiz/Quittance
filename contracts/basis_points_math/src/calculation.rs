const BPS_DENOMINATOR: i128 = 10_000;

/// Multiply an amount by a basis-points rate, truncating toward zero.
pub fn mul_bps(amount: i128, bps: u32) -> Option<i128> {
    let rate = i128::from(bps);
    let whole = (amount / BPS_DENOMINATOR).checked_mul(rate)?;
    let fractional = (amount % BPS_DENOMINATOR).checked_mul(rate)? / BPS_DENOMINATOR;
    whole.checked_add(fractional)
}

/// Add a basis-points amount to the original amount.
pub fn checked_add_bps(amount: i128, bps: u32) -> Option<i128> {
    amount.checked_add(mul_bps(amount, bps)?)
}
