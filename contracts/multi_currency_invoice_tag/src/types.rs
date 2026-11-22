//! Type definitions for the `multi-currency-invoice-tag` crate.
//!
//! An invoice tag maps an invoice identifier to the single asset code that
//! invoice may be settled in. The tag is written once at creation time and
//! never changes.

use soroban_sdk::{contracttype, Symbol};

/// Storage keys for the contract's state.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The asset code an invoice is tagged with at creation time.
    Tag(Symbol),
}
