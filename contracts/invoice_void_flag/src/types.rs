//! Type definitions for `invoice-void-flag`.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// Persistent storage keys for invoice lifecycle state.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the current [`InvoiceState`] for an `invoice_id`.
    State(Symbol),
    /// Optional registered owner `Address` for an `invoice_id`.
    Owner(Symbol),
}

/// Lifecycle state tracked for an invoice id.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum InvoiceState {
    /// Invoice is active and unpaid.
    Open = 0,
    /// Invoice was voided by its seller.
    Void = 1,
    /// Invoice has been paid.
    Paid = 2,
    /// Invoice has expired.
    Expired = 3,
}

/// Errors returned by `invoice-void-flag`.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The invoice has already been voided.
    AlreadyVoid = 1,
    /// The invoice has already been paid and cannot be voided.
    AlreadyPaid = 2,
    /// The invoice has already expired and cannot be voided.
    InvoiceExpired = 3,
    /// Caller does not match the seller registered for this invoice.
    UnauthorizedSeller = 4,
    /// The invoice id was already registered.
    AlreadyRegistered = 5,
}

impl Error {
    /// Human-readable error description.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            Error::AlreadyVoid => "Invoice has already been voided.",
            Error::AlreadyPaid => "Paid invoices cannot be voided.",
            Error::InvoiceExpired => "Expired invoices cannot be voided.",
            Error::UnauthorizedSeller => "Only the invoice's seller may void this invoice.",
            Error::AlreadyRegistered => "Invoice is already registered.",
        }
    }
}
