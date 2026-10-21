//! Type definitions for the `fee-tier-lookup` crate.
//!
//! A *tier* is a single bracket: every amount that is `<= upto_amount` (and
//! greater than the previous tier's bound) resolves to `bps` basis points.
//! Tiers are stored in ascending `upto_amount` order and form a left-open,
//! right-closed partition of the positive amount range.

use soroban_sdk::{contracterror, contracttype};

/// A single fee bracket.
///
/// `upto_amount` is the inclusive upper bound of the bracket, expressed in the
/// same integer units as the amount passed to `fee_bps_for` (usually stroops
/// for a 7-decimal Stellar asset). `bps` is the fee in basis points
/// (`1 bps == 0.01%`, so `10_000 bps == 100%`).
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Tier {
    /// Inclusive upper bound of this bracket, in amount units.
    pub upto_amount: i128,
    /// Fee applied to amounts that fall inside this bracket, in basis points.
    pub bps: u32,
}

/// Storage keys for the contract's instance state.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The address allowed to mutate fee tiers.
    Admin,
    /// The ordered list of fee brackets.
    Tiers,
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TierError {
    /// `set_tier`/`set_tiers`/`set_admin` was called by an address that is not
    /// the current admin.
    NotAuthorised = 1,
    /// A basis-point value is outside the meaningful `0..=10_000` range.
    InvalidBps = 2,
    /// A tier bound was not strictly greater than the previous bound, or was
    /// not positive.
    InvalidBound = 3,
    /// `fee_bps_for` was called before any tier had been configured.
    NoTiersConfigured = 4,
}

impl TierError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            TierError::NotAuthorised => "Caller is not the fee admin.",
            TierError::InvalidBps => "Basis points must be between 0 and 10000.",
            TierError::InvalidBound => "Tier bounds must be positive and strictly increasing.",
            TierError::NoTiersConfigured => "No fee tiers have been configured.",
        }
    }
}

/// The maximum meaningful basis-points value (100%).
pub const MAX_BPS: u32 = 10_000;
