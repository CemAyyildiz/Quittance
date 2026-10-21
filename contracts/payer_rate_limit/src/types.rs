//! Internal storage types for the rate limiter.

use std::collections::HashMap;

/// Per-payer log of the ledger sequence numbers at which a payment
/// attempt was recorded, in the order they were recorded.
pub(crate) type AttemptLog = HashMap<String, Vec<u32>>;
