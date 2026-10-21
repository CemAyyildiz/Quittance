//! `invoice-currency-lock` — standalone Soroban contract: invoice currency
//! lock.
//!
//! Locks an invoice to one asset code at creation time and rejects any later
//! attempt to change its currency.
//!
//! # What it does
//!
//! `lock_currency(invoice_id, code)` binds an invoice to an asset code. Once
//! the lock exists it is permanent: a later attempt to lock the same invoice
//! to a *different* code fails with
//! [`CurrencyLockError::CurrencyMismatch`], and the original lock is left
//! untouched. Re-locking with the *same* code is a no-op, so a retried
//! transaction cannot break the invoice.
//!
//! `assert_currency(invoice_id, code)` reports whether an invoice is locked to
//! the given code.
//!
//! # Rules
//!
//! 1. **One code per invoice** — an invoice is denominated in exactly one
//!    asset.
//! 2. **The lock is permanent** — the stored code is never overwritten.
//! 3. **Valid codes only** — the asset code must be 1–12 ASCII alphanumeric
//!    characters, matching Stellar's asset-code rules.
//! 4. **Retries are safe** — locking an invoice to the code it already holds
//!    succeeds without changing anything.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `lock_currency(invoice_id, code)` | `fn(Env, Symbol, Symbol) -> Result<(), CurrencyLockError>` | Lock an invoice to an asset code. |
//! | `assert_currency(invoice_id, code)` | `fn(Env, Symbol, Symbol) -> bool` | Whether the invoice is locked to `code`. |
//! | `require_currency(invoice_id, code)` | `fn(Env, Symbol, Symbol) -> Result<(), CurrencyLockError>` | Fail unless the invoice is locked to `code`. |
//! | `locked_currency(invoice_id)` | `fn(Env, Symbol) -> Option<Symbol>` | Read the locked asset code, if any. |
//! | `is_locked(invoice_id)` | `fn(Env, Symbol) -> bool` | Whether the invoice has a lock. |
//! | `CurrencyLockError` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//!
//! # Usage
//!
//! ```rust
//! use invoice_currency_lock::{InvoiceCurrencyLock, InvoiceCurrencyLockClient};
//! use soroban_sdk::{symbol_short, Env};
//!
//! let env = Env::default();
//! env.mock_all_auths();
//! let contract_id = env.register(InvoiceCurrencyLock, ());
//! let client = InvoiceCurrencyLockClient::new(&env, &contract_id);
//!
//! let invoice = symbol_short!("INV1");
//! let usd = symbol_short!("USD");
//!
//! client.lock_currency(&invoice, &usd);
//! assert!(client.assert_currency(&invoice, &usd));
//! assert!(!client.assert_currency(&invoice, &symbol_short!("EUR")));
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cd contracts/invoice_currency_lock
//! cargo test
//! cargo clippy --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

extern crate alloc;

mod lock;
mod storage;
mod types;

pub use crate::lock::{matches, validate_asset_code, MAX_ASSET_CODE_LEN};
pub use crate::types::CurrencyLockError;

use alloc::string::ToString;

use soroban_sdk::{contract, contractimpl, Env, Symbol};

/// Invoice currency lock.
#[contract]
pub struct InvoiceCurrencyLock;

#[contractimpl]
impl InvoiceCurrencyLock {
    /// Lock `invoice_id` to the asset code `code`.
    ///
    /// The first lock for an invoice writes the code. Locking an already
    /// locked invoice to the same code succeeds and changes nothing. Locking
    /// it to a different code fails with
    /// [`CurrencyLockError::CurrencyMismatch`] and leaves the original lock
    /// in place.
    ///
    /// Returns [`CurrencyLockError::InvalidAssetCode`] when `code` is not a
    /// valid Stellar asset code.
    pub fn lock_currency(
        env: Env,
        invoice_id: Symbol,
        code: Symbol,
    ) -> Result<(), CurrencyLockError> {
        validate_asset_code(&code.to_string())?;

        match storage::locked_currency(&env, &invoice_id) {
            Some(existing) => {
                if existing == code {
                    // Re-locking to the same code is a no-op, so a retried
                    // transaction cannot break the invoice.
                    Ok(())
                } else {
                    Err(CurrencyLockError::CurrencyMismatch)
                }
            }
            None => {
                storage::set_locked_currency(&env, &invoice_id, &code);
                Ok(())
            }
        }
    }

    /// Return whether `invoice_id` is locked to `code`.
    ///
    /// An invoice that is not locked at all returns `false`: without a lock
    /// there is nothing to confirm the requested code against.
    pub fn assert_currency(env: Env, invoice_id: Symbol, code: Symbol) -> bool {
        matches(storage::locked_currency(&env, &invoice_id).as_ref(), &code)
    }

    /// Strict counterpart of [`assert_currency`]: fails unless the invoice is
    /// locked to `code`.
    ///
    /// Returns [`CurrencyLockError::InvoiceNotLocked`] when the invoice has no
    /// lock at all, and [`CurrencyLockError::CurrencyMismatch`] when it is
    /// locked to a different code.
    pub fn require_currency(
        env: Env,
        invoice_id: Symbol,
        code: Symbol,
    ) -> Result<(), CurrencyLockError> {
        match storage::locked_currency(&env, &invoice_id) {
            Some(locked) if locked == code => Ok(()),
            Some(_) => Err(CurrencyLockError::CurrencyMismatch),
            None => Err(CurrencyLockError::InvoiceNotLocked),
        }
    }

    /// Return the asset code `invoice_id` is locked to, or `None` when the
    /// invoice is not locked.
    pub fn locked_currency(env: Env, invoice_id: Symbol) -> Option<Symbol> {
        storage::locked_currency(&env, &invoice_id)
    }

    /// Return whether `invoice_id` has a currency lock.
    pub fn is_locked(env: Env, invoice_id: Symbol) -> bool {
        storage::is_locked(&env, &invoice_id)
    }
}
