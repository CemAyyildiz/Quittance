//! Storage keys and events for `sliding-window-counter`.

use soroban_sdk::{contractevent, contracttype};

/// Keys used by the contract's instance storage.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// The recorded event ledgers, in insertion order.
    Records,
}

/// Emitted for every recorded event.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecordedEvent {
    /// Ledger the event was recorded at.
    #[topic]
    pub ledger: u32,
    /// Total number of events recorded by the contract so far.
    pub total: u32,
}

/// Emitted when old events are pruned.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PrunedEvent {
    /// Number of events that were removed.
    pub removed: u32,
    /// Number of events that are still stored.
    pub remaining: u32,
}

/// Emitted when all events are cleared.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClearedEvent {
    /// Number of events that were removed.
    pub removed: u32,
}
