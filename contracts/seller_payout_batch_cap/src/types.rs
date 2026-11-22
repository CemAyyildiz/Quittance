use soroban_sdk::{contracterror, contracttype};

/// Instance storage keys.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Address authorized to configure the cap.
    Admin,
    /// Maximum number of payout entries in one batch.
    MaxBatchSize,
}

/// Batch validation errors.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The requested entry count exceeds the configured cap.
    BatchTooLarge = 1,
}
