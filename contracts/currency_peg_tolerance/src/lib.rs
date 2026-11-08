#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env};
pub use types::{DataKey, PegBandEvaluation, PegToleranceError};
pub use validator::{compute_band, BPS_DENOMINATOR, MAX_TOLERANCE_BPS};

#[contract]
pub struct CurrencyPegToleranceContract;

#[contractimpl]
impl CurrencyPegToleranceContract {
    /// Pure check returning `true` when `quoted_rate` lies within `tolerance_bps`
    /// around `reference_rate`, or `false` if outside the band or inputs are invalid.
    pub fn is_within_band(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> bool {
        match compute_band(quoted_rate, reference_rate, tolerance_bps) {
            Ok(eval) => eval.within_band,
            Err(_) => false,
        }
    }

    /// Evaluates the tolerance band and returns a detailed `PegBandEvaluation` or error.
    pub fn evaluate_band(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> Result<PegBandEvaluation, PegToleranceError> {
        compute_band(quoted_rate, reference_rate, tolerance_bps)
    }

    /// Asserts that `quoted_rate` is within the tolerance band, returning `Err(OutOfBand)` otherwise.
    pub fn require_within_band(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> Result<PegBandEvaluation, PegToleranceError> {
        let eval = compute_band(quoted_rate, reference_rate, tolerance_bps)?;
        if !eval.within_band {
            return Err(PegToleranceError::OutOfBand);
        }
        Ok(eval)
    }

    /// Configures an optional default tolerance (in basis points) stored in instance storage.
    pub fn set_default_tolerance(
        env: Env,
        admin: Address,
        tolerance_bps: u32,
    ) -> Result<(), PegToleranceError> {
        if tolerance_bps > MAX_TOLERANCE_BPS {
            return Err(PegToleranceError::ToleranceTooHigh);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::DefaultToleranceBps, &tolerance_bps);
        Ok(())
    }

    /// Returns the stored default tolerance in basis points (defaults to 100 bps = 1%).
    pub fn default_tolerance(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::DefaultToleranceBps)
            .unwrap_or(100)
    }
}
