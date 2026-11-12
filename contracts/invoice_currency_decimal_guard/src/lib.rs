//! `invoice-currency-decimal-guard` — standalone Soroban contract implementing
//! an expected-decimals mismatch guard for invoice payments.

#![no_std]
#![deny(unsafe_code)]

pub mod types;
pub mod validator;

pub use crate::types::{DecimalGuardError, MAX_TOKEN_DECIMALS, STELLAR_DEFAULT_DECIMALS};
pub use crate::validator::{check_bounds, is_matching_decimals, verify_decimals_match};

use soroban_sdk::{contract, contractimpl, Env};

/// Expected-decimals mismatch guard contract.
#[contract]
pub struct InvoiceCurrencyDecimalGuard;

#[contractimpl]
impl InvoiceCurrencyDecimalGuard {
    /// Returns `true` when `token_decimals` equals `expected_decimals` and both are within supported bounds (`0..=18`).
    pub fn matches_expected_decimals(
        _env: Env,
        token_decimals: u32,
        expected_decimals: u32,
    ) -> bool {
        is_matching_decimals(token_decimals, expected_decimals)
    }

    /// Strict counterpart to [`Self::matches_expected_decimals`]: returns an error when bounds fail or decimals mismatch.
    pub fn require_expected_decimals(
        _env: Env,
        token_decimals: u32,
        expected_decimals: u32,
    ) -> Result<(), DecimalGuardError> {
        verify_decimals_match(token_decimals, expected_decimals)
    }

    /// Validates that a single decimals value does not exceed [`MAX_TOKEN_DECIMALS`].
    pub fn validate_decimals(_env: Env, decimals: u32) -> Result<(), DecimalGuardError> {
        if check_bounds(decimals) {
            Ok(())
        } else {
            Err(DecimalGuardError::TokenDecimalsOutOfRange)
        }
    }

    /// Returns the maximum supported token decimals (`18`).
    pub fn max_supported_decimals(_env: Env) -> u32 {
        MAX_TOKEN_DECIMALS
    }
}
