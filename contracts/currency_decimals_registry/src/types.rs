use soroban_sdk::{contracterror, contracttype, Symbol};

/// Keys for the fixed administrator and per-code decimal values.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Decimals(Symbol),
}

/// Errors returned by registry updates.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RegistryError {
    NotAdmin = 1,
    InvalidDecimals = 2,
}
