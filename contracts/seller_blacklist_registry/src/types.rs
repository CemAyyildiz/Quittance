//! Type definitions for `seller-blacklist-registry`.

use soroban_sdk::{contracterror, contracttype, Address};

/// Storage keys for the seller blacklist registry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Optional administrator address stored on the contract instance.
    Admin,
    /// Persistent flag indicating that a seller address is blacklisted.
    Blacklisted(Address),
}

/// Errors returned by administrative setup entry points.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BlacklistError {
    /// An admin address has already been configured for this instance.
    AdminAlreadyInitialized = 1,
}

impl BlacklistError {
    /// Human-readable error message.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            BlacklistError::AdminAlreadyInitialized => "Administrator is already initialized.",
        }
    }
}
