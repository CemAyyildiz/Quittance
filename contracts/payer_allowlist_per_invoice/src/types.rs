use soroban_sdk::{contracttype, Symbol};

/// Storage keys for the contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the allowlist for a specific invoice.
    /// Maps: invoice_id -> Vec<Address>
    Allowlist(Symbol),
}
