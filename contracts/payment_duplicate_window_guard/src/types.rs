use soroban_sdk::{contracttype, Symbol};

/// Persistent storage keys used by the guard.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Latest accepted ledger for a payment reference.
    Reference(Symbol),
}
