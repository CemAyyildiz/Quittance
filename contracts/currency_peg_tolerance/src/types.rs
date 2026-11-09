//! Type definitions for `currency-peg-tolerance`.

use soroban_sdk::contracterror;

pub const BPS_DENOMINATOR: i128 = 10_000;
pub const MAX_TOLERANCE_BPS: u32 = 10_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidReferenceRate = 1,
    InvalidQuotedRate = 2,
    InvalidToleranceBps = 3,
    OutOfBand = 4,
    ArithmeticOverflow = 5,
}
