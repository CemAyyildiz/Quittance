#![no_std]
#![deny(unsafe_code)]

mod calculation;

use soroban_sdk::{contract, contractimpl, Env};

/// Stateless overflow-checked basis-points arithmetic contract.
#[contract]
pub struct BasisPointsMath;

#[contractimpl]
impl BasisPointsMath {
    /// Multiply `amount` by `bps / 10_000`, truncating toward zero.
    pub fn mul_bps(_env: Env, amount: i128, bps: u32) -> Option<i128> {
        calculation::mul_bps(amount, bps)
    }

    /// Add `amount * bps / 10_000` to `amount`, returning `None` on overflow.
    pub fn checked_add_bps(_env: Env, amount: i128, bps: u32) -> Option<i128> {
        calculation::checked_add_bps(amount, bps)
    }
}
