//! Append-only log of invoice amount adjustments.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod storage;
mod types;

pub use types::{AmountChange, Error};

use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec};

#[cfg(test)]
mod tests;

/// Records every amount adjustment made to an invoice.
#[contract]
pub struct InvoiceAmountHistory;

#[contractimpl]
impl InvoiceAmountHistory {
    /// Append one amount adjustment for `invoice_id`, oldest first.
    ///
    /// `old_amount` and `new_amount` are invoice amounts in stroops and must be
    /// non-negative. `old_amount` must differ from `new_amount`, so every entry
    /// records a real change. `ledger` is the ledger sequence of the
    /// adjustment; the caller supplies it because this log does not require a
    /// transfer to happen in the same ledger.
    ///
    /// The log is append-only: entries cannot be updated or removed.
    pub fn record_adjustment(
        env: Env,
        invoice_id: Symbol,
        old_amount: i128,
        new_amount: i128,
        ledger: u32,
    ) -> Result<(), Error> {
        if old_amount < 0 || new_amount < 0 {
            return Err(Error::NegativeAmount);
        }
        if old_amount == new_amount {
            return Err(Error::UnchangedAmount);
        }
        if ledger == 0 {
            return Err(Error::InvalidLedger);
        }

        let history = storage::load(&env, &invoice_id);
        storage::append(
            &env,
            &invoice_id,
            AmountChange {
                old_amount,
                new_amount,
                ledger,
            },
            history,
        );
        Ok(())
    }

    /// Return every stored adjustment for `invoice_id` in append order.
    ///
    /// Unknown invoices return an empty vector rather than an error.
    pub fn history_for(env: Env, invoice_id: Symbol) -> Vec<AmountChange> {
        storage::load(&env, &invoice_id)
    }
}
