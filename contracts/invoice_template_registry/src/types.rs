//! Type definitions for `invoice-template-registry`.

use soroban_sdk::{contracterror, contracttype, Address, Symbol};

/// Persistent storage keys for seller templates.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Keyed by `(seller, template_id)` so sellers have isolated namespaces.
    Template(Address, Symbol),
}

/// A reusable invoice template registered by a seller.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Template {
    /// Seller address that owns the template.
    pub seller: Address,
    /// Template identifier within the seller's namespace.
    pub template_id: Symbol,
    /// Fixed invoice amount in stroops (must be strictly positive).
    pub amount: i128,
    /// Default memo pattern symbol for invoices stamped from this template.
    pub memo: Symbol,
}

/// Errors returned by `invoice-template-registry`.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// Template amount must be strictly greater than zero (`amount > 0`).
    InvalidAmount = 1,
    /// A template with the same `template_id` already exists for this seller.
    TemplateAlreadyExists = 2,
    /// No template with `template_id` exists for this seller.
    TemplateNotFound = 3,
}

impl Error {
    /// Human-readable error description.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            Error::InvalidAmount => "Template amount must be strictly positive.",
            Error::TemplateAlreadyExists => "Template already exists for this seller.",
            Error::TemplateNotFound => "Template not found for this seller.",
        }
    }
}
