//! Basis-point payout splitter.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod error;
mod split;
mod types;

pub use error::SplitError;
pub use split::{apply_bps, splits_are_valid, validate_bps};
pub use types::{SplitPlan, BPS_TOTAL, MAX_PAYEES};

use soroban_sdk::{contract, contractimpl, panic_with_error, Env, Vec};

#[cfg(test)]
mod tests;

/// Splits a payment amount across payees by basis points.
#[contract]
pub struct PayoutSplit;

#[contractimpl]
impl PayoutSplit {
    /// Returns true when `bps` contains 1 to 8 shares that sum to exactly 10_000.
    pub fn validate_splits(_env: Env, bps: Vec<u32>) -> bool {
        match copy_bps(&bps) {
            Ok(copied) => splits_are_valid(&copied.0[..copied.1]),
            Err(_) => false,
        }
    }

    /// Applies `bps` to `amount`.
    ///
    /// Panics with [`SplitError`] when the shares are invalid or `amount` is negative.
    /// Dust from integer division is given to the last payee.
    pub fn apply_split(env: Env, amount: i128, bps: Vec<u32>) -> Vec<i128> {
        let copied = match copy_bps(&bps) {
            Ok(copied) => copied,
            Err(error) => panic_with_error!(&env, error),
        };
        let plan = match apply_bps(amount, &copied.0[..copied.1]) {
            Ok(plan) => plan,
            Err(error) => panic_with_error!(&env, error),
        };
        let mut out = Vec::new(&env);
        for share in plan.shares.into_iter().take(plan.len) {
            out.push_back(share);
        }
        out
    }
}

struct CopiedBps([u32; MAX_PAYEES], usize);

fn copy_bps(bps: &Vec<u32>) -> Result<CopiedBps, SplitError> {
    let len = bps.len();
    if len == 0 {
        return Err(SplitError::Empty);
    }
    if len > MAX_PAYEES as u32 {
        return Err(SplitError::TooManyPayees);
    }
    let mut buf = [0_u32; MAX_PAYEES];
    for index in 0..len {
        buf[index as usize] = bps.get(index).unwrap_or(0);
    }
    Ok(CopiedBps(buf, len as usize))
}
