//! Type definitions for the `settlement-batch-id` crate.
//!
//! A settlement batch groups several invoice ids under one batch id. The
//! batch id is derived from the batch contents, so the same set of invoices
//! always maps to the same batch id.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// Storage keys for the contract's instance state.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The invoices grouped under a batch.
    Batch(Symbol),
    /// The number of batches started so far.
    BatchCount,
}

/// A settlement batch: the invoices it groups and the cap it was created with.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Batch {
    /// The invoice ids grouped under this batch.
    pub invoices: soroban_sdk::Vec<Symbol>,
    /// The maximum number of invoices this batch may hold.
    pub max_size: u32,
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BatchError {
    /// A batch must group at least one invoice.
    EmptyBatch = 1,
    /// The maximum batch size must be at least one.
    InvalidMaxSize = 2,
    /// The maximum batch size exceeds the crate's hard limit.
    MaxSizeTooLarge = 3,
    /// More invoices were supplied than the batch size allows.
    BatchTooLarge = 4,
    /// The same invoice id appeared twice in one batch.
    DuplicateInvoice = 5,
}

impl BatchError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            BatchError::EmptyBatch => "A settlement batch must contain at least one invoice.",
            BatchError::InvalidMaxSize => "Maximum batch size must be at least one.",
            BatchError::MaxSizeTooLarge => "Maximum batch size exceeds the supported limit.",
            BatchError::BatchTooLarge => "Batch contains more invoices than its maximum size.",
            BatchError::DuplicateInvoice => "The same invoice id cannot appear twice in one batch.",
        }
    }
}

/// The largest batch size the crate supports.
///
/// Soroban vectors are bounded on-chain, so a batch is capped rather than
/// accepting an arbitrary number of invoice ids.
pub const MAX_BATCH_SIZE: u32 = 10;

/// The number of hex characters of the digest kept in a batch id.
pub const BATCH_ID_HEX_LEN: usize = 16;
