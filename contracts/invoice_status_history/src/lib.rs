#![no_std]

//! Standalone, append-only Soroban log of invoice status changes.

mod storage;
mod types;

pub use types::{Error, Status, Transition};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};
use types::DataKey;

/// Records an authorized audit trail, separately for each invoice ID.
#[contract]
pub struct InvoiceStatusHistory;

#[contractimpl]
impl InvoiceStatusHistory {
    /// Fix the writer address at deployment. The writer cannot be changed.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Append a status change with the current ledger timestamp.
    ///
    /// The configured writer must authorize the call. The first entry may
    /// start at any status; later entries must continue from the last `to`.
    /// This log does not impose invoice lifecycle rules on the caller.
    pub fn append(env: Env, invoice_id: Symbol, from: Status, to: Status) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if from == to {
            return Err(Error::UnchangedStatus);
        }

        let history = storage::load(&env, &invoice_id);
        if !history.is_empty() && history.get(history.len() - 1).unwrap().to != from {
            return Err(Error::DisconnectedTransition);
        }

        let entry = Transition {
            from,
            to,
            at: env.ledger().timestamp(),
        };
        storage::append(&env, &invoice_id, entry, history);
        Ok(())
    }

    /// Return the complete stored history in append order, or an empty vector.
    pub fn history_of(env: Env, invoice_id: Symbol) -> Vec<Transition> {
        storage::load(&env, &invoice_id)
    }
}

#[cfg(test)]
mod tests;
