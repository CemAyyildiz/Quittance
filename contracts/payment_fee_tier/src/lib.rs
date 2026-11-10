#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Env, Vec};
pub use types::{FeeTierError, FeeTierQuote};
pub use validator::{resolve_tier, MAX_FEE_BPS};

#[contract]
pub struct PaymentFeeTierContract;

#[contractimpl]
impl PaymentFeeTierContract {
    /// Looks up the fee in basis points for `cumulative_volume` against ascending
    /// `(min_volume, fee_bps)` `thresholds`.
    pub fn fee_bps_for_volume(
        _env: Env,
        cumulative_volume: i128,
        thresholds: Vec<(i128, u32)>,
    ) -> Result<u32, FeeTierError> {
        Ok(resolve_tier(cumulative_volume, &thresholds)?.fee_bps)
    }

    /// Returns the full `FeeTierQuote` including the matched threshold and fee bps.
    pub fn quote_tier(
        _env: Env,
        cumulative_volume: i128,
        thresholds: Vec<(i128, u32)>,
    ) -> Result<FeeTierQuote, FeeTierError> {
        resolve_tier(cumulative_volume, &thresholds)
    }

    /// Computes the fee amount for `payment_amount` at the tier matching `cumulative_volume`.
    pub fn compute_fee_amount(
        _env: Env,
        payment_amount: i128,
        cumulative_volume: i128,
        thresholds: Vec<(i128, u32)>,
    ) -> Result<i128, FeeTierError> {
        if payment_amount <= 0 {
            return Err(FeeTierError::InvalidPaymentAmount);
        }
        let quote = resolve_tier(cumulative_volume, &thresholds)?;
        Ok((payment_amount * (quote.fee_bps as i128)) / (MAX_FEE_BPS as i128))
    }
}
