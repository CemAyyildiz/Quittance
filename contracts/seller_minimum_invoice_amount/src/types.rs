use soroban_sdk::{contracterror, contracttype, Address};

/// Default minimum for sellers that have no stored override (no minimum).
pub const DEFAULT_MINIMUM: i128 = 0;

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    SellerMinimum(Address),
}

/// Errors returned by the per-seller minimum invoice amount contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The configured minimum was negative; minimums must be non-negative.
    NegativeMinimum = 1,
}
