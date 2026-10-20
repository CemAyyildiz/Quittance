//! Storage keys, contract errors, and events for `memo-commit-reveal`.

use soroban_sdk::{contracterror, contractevent, contracttype, BytesN};

/// Keys used by the contract's storage.
///
/// Pending commitments are per hash, so several payers can commit
/// concurrently without overwriting each other.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// A pending commitment for a specific memo hash.
    Commitment(BytesN<32>),
    /// Number of pending commitments.
    Count,
}

/// Errors returned by [`crate::MemoCommitReveal`].
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The memo was longer than [`crate::MAX_MEMO_BYTES`].
    MemoTooLong = 1,
}

/// Emitted when a commitment is accepted.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommittedEvent {
    /// Hash that was committed.
    #[topic]
    pub hash: BytesN<32>,
}

/// Emitted when a commitment is matched by a revealed memo.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RevealedEvent {
    /// Hash that the revealed memo matched.
    #[topic]
    pub hash: BytesN<32>,
}

/// Emitted when a pending commitment is cancelled before it is revealed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CancelledEvent {
    /// Hash that was cancelled.
    #[topic]
    pub hash: BytesN<32>,
}
