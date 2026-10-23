//! Types for the `invoice-category-registry` crate.
//!
//! The registry holds a short, admin-defined list of category symbols. Every
//! invoice can carry at most one tag, and the tag must come from that list.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// Upper bound on the number of categories the admin can register.
///
/// The list is deliberately small: categories are meant to be a fixed set an
/// admin curates, not a free-form tag cloud. The cap keeps the registry (which
/// lives in instance storage) bounded forever.
pub const MAX_CATEGORIES: u32 = 32;

/// Storage keys used by this contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The address allowed to register categories.
    Admin,
    /// The registered category list, in registration order.
    Categories,
    /// The category tag recorded for an invoice.
    InvoiceCategory(Symbol),
}

/// Errors returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The caller is not the admin recorded at deployment.
    NotAdmin = 1,
    /// The category is not in the registered list, so it cannot tag an invoice.
    UnknownCategory = 2,
    /// The registry already holds [`MAX_CATEGORIES`] categories.
    RegistryFull = 3,
}

impl Error {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            Error::NotAdmin => "Only the admin can register categories.",
            Error::UnknownCategory => "Category is not registered.",
            Error::RegistryFull => "The category registry is full.",
        }
    }
}
