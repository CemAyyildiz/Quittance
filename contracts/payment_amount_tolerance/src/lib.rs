#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Env};
pub use types::{AmountToleranceError, AmountToleranceEvaluation};
pub use validator::evaluate_amount_tolerance;

#[contract]
pub struct PaymentAmountToleranceContract;

#[contractimpl]
impl PaymentAmountToleranceContract {
    /// Pure predicate returning `true` if `received` is within absolute `tolerance`
    /// of `expected` (and inputs are valid).
    pub fn is_within_tolerance(
        _env: Env,
        expected: i128,
        received: i128,
        tolerance: i128,
    ) -> bool {
        match evaluate_amount_tolerance(expected, received, tolerance) {
            Ok(eval) => eval.within_tolerance,
            Err(_) => false,
        }
    }

    /// Evaluates the payment amount tolerance and returns detailed bounds or an error.
    pub fn evaluate(
        _env: Env,
        expected: i128,
        received: i128,
        tolerance: i128,
    ) -> Result<AmountToleranceEvaluation, AmountToleranceError> {
        evaluate_amount_tolerance(expected, received, tolerance)
    }

    /// Enforces that `received` is within `tolerance` of `expected`, returning `Err(OutsideTolerance)` otherwise.
    pub fn require_within_tolerance(
        _env: Env,
        expected: i128,
        received: i128,
        tolerance: i128,
    ) -> Result<AmountToleranceEvaluation, AmountToleranceError> {
        let eval = evaluate_amount_tolerance(expected, received, tolerance)?;
        if !eval.within_tolerance {
            return Err(AmountToleranceError::OutsideTolerance);
        }
        Ok(eval)
    }
}
