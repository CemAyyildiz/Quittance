use soroban_sdk::{contracttype, Address, Symbol};

/// Maximum number of observers (M) a single quorum may be configured with.
///
/// The bound keeps the observer membership check cheap on-chain and keeps a
/// single storage entry within the Soroban ledger entry size limits.
pub const MAX_OBSERVERS: u32 = 64;

/// Storage keys used by the confirmation quorum contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Address allowed to configure the quorum.
    Admin,
    /// Marker set once the quorum has been configured.
    Initialized,
    /// The configured observer set (M observers).
    Observers,
    /// Per-reference, per-observer confirmation marker.
    Confirmation(Symbol, Address),
    /// Number of distinct observers that confirmed a reference.
    ConfirmationCount(Symbol),
}
