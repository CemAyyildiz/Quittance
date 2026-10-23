use soroban_sdk::{contracttype, Address};

/// Storage keys used by the suspension registry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Contract administrator.
    Admin,
    /// Suspension flag for one seller.
    Seller(Address),
}
