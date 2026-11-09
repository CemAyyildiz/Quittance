//! Type definitions for `invoice-cancellation-window`.

use soroban_sdk::{contracterror, contracttype, Address, Symbol};

/// Persistent storage keys for invoice cancellation and payment state.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the [`CancellationRecord`] for an invoice id.
    Cancelled(Symbol),
    /// Stores whether an invoice id has already been paid.
    Paid(Symbol),
}

/// Metadata recorded when a payer cancels an invoice inside its window.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CancellationRecord {
    /// The payer address that authorized the cancellation.
    pub payer: Address,
    /// The ledger at which the invoice was created.
    pub created_at: u32,
    /// The ledger at which the cancellation occurred.
    pub cancelled_at: u32,
}

/// Errors returned by `invoice-cancellation-window`.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// `current_ledger` is past `created_at + window`.
    WindowClosed = 1,
    /// `current_ledger` is strictly before `created_at`.
    InvalidLedgerOrder = 2,
    /// The invoice was already cancelled earlier.
    AlreadyCancelled = 3,
    /// The invoice has already been marked paid and cannot be cancelled.
    AlreadyPaid = 4,
}

impl Error {
    /// Human-readable message for off-chain diagnostics.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            Error::WindowClosed => "The buyer cancellation window has closed.",
            Error::InvalidLedgerOrder => "Current ledger cannot precede invoice creation ledger.",
            Error::AlreadyCancelled => "Invoice has already been cancelled.",
            Error::AlreadyPaid => "Paid invoices cannot be cancelled.",
        }
    }
}
