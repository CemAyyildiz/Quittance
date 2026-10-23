use soroban_sdk::{contracterror, contracttype, Symbol};

/// Persistent storage keys.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Most recent accepted ledger for a reference.
    Reference(Symbol),
}

/// Retry validation errors.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Fewer than `min_gap` ledgers elapsed since the last attempt.
    RetryTooSoon = 1,
    /// The supplied ledger predates the last accepted attempt.
    LedgerRegression = 2,
}
