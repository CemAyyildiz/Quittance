//! `settlement-batch-id` — standalone Soroban contract: settlement batch
//! grouping.
//!
//! Groups multiple invoice ids under one settlement batch id, with a maximum
//! batch size.
//!
//! # What it does
//!
//! `start_batch(invoice_ids, max_size)` groups the given invoice ids into a
//! batch and returns the batch id. The id is derived from the batch contents:
//! the invoice ids are sorted, joined, hashed with SHA-256, and the digest is
//! rendered as a short hexadecimal id. Two consequences follow:
//!
//! 1. **Grouping is deterministic** — the same set of invoices always yields
//!    the same batch id, no matter in which order they were supplied.
//! 2. **Grouping is idempotent** — starting a batch that already exists
//!    returns the same id instead of creating a second copy, so a retried
//!    transaction cannot double-group invoices.
//!
//! # Rules
//!
//! 1. **Non-empty** — a batch groups at least one invoice.
//! 2. **Bounded** — the batch may not hold more invoices than `max_size`.
//! 3. **No duplicates** — an invoice id appears at most once in a batch.
//! 4. **Bounded cap** — `max_size` is at least 1 and at most
//!    [`MAX_BATCH_SIZE`].
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `start_batch(invoice_ids, max_size)` | `fn(Env, Vec<Symbol>, u32) -> Result<Symbol, BatchError>` | Group invoice ids into a batch and return its id. |
//! | `batch_invoices(batch_id)` | `fn(Env, Symbol) -> Vec<Symbol>` | Read the invoices grouped under a batch (empty when unknown). |
//! | `batch_size(batch_id)` | `fn(Env, Symbol) -> u32` | Read the invoice count of a batch (0 when unknown). |
//! | `is_in_batch(batch_id, invoice_id)` | `fn(Env, Symbol, Symbol) -> bool` | Whether an invoice is grouped under a batch. |
//! | `total_batches()` | `fn(Env) -> u32` | How many batches have been started. |
//! | `BatchError` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//!
//! # Usage
//!
//! ```rust
//! use settlement_batch_id::{SettlementBatchId, SettlementBatchIdClient};
//! use soroban_sdk::{symbol_short, vec, Env};
//!
//! let env = Env::default();
//! env.mock_all_auths();
//! let contract_id = env.register(SettlementBatchId, ());
//! let client = SettlementBatchIdClient::new(&env, &contract_id);
//!
//! let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];
//! let batch_id = client.start_batch(&invoices, &5);
//!
//! assert!(client.is_in_batch(&batch_id, &symbol_short!("INV1")));
//! assert_eq!(client.batch_size(&batch_id), 2);
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cd contracts/settlement_batch_id
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

mod batch;
mod storage;
mod types;

pub use crate::batch::{derive_batch_id, has_duplicates, id_preimage, sorted, validate};
pub use crate::types::{Batch, BatchError, BATCH_ID_HEX_LEN, MAX_BATCH_SIZE};

use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec};

/// Settlement batch grouping.
#[contract]
pub struct SettlementBatchId;

#[contractimpl]
impl SettlementBatchId {
    /// Group `invoice_ids` into a settlement batch and return the batch id.
    ///
    /// The batch id is derived from the invoice ids, so the same invoices
    /// always map to the same id regardless of the order they are supplied
    /// in. Starting a batch that already exists returns the existing id
    /// without creating a second copy.
    ///
    /// Fails with [`BatchError::InvalidMaxSize`] when `max_size` is zero,
    /// [`BatchError::MaxSizeTooLarge`] when it exceeds
    /// [`MAX_BATCH_SIZE`], [`BatchError::EmptyBatch`] when no invoice is
    /// supplied, [`BatchError::BatchTooLarge`] when more invoices than
    /// `max_size` are supplied, and [`BatchError::DuplicateInvoice`] when an
    /// invoice id appears twice.
    pub fn start_batch(
        env: Env,
        invoice_ids: Vec<Symbol>,
        max_size: u32,
    ) -> Result<Symbol, BatchError> {
        let invoices: alloc::vec::Vec<Symbol> = invoice_ids.iter().collect();
        validate(&invoices, max_size)?;

        let batch_id = batch::derive_batch_id(&env, &invoices);

        if storage::batch(&env, &batch_id).is_none() {
            let batch = Batch {
                invoices: invoice_ids.clone(),
                max_size,
            };
            storage::set_batch(&env, &batch_id, &batch);
            storage::increment_batch_count(&env);
        }

        Ok(batch_id)
    }

    /// Return the invoice ids grouped under `batch_id`.
    ///
    /// An unknown batch yields an empty vector; a batch always holds at least
    /// one invoice, so an empty result means "no such batch".
    pub fn batch_invoices(env: Env, batch_id: Symbol) -> Vec<Symbol> {
        storage::batch(&env, &batch_id)
            .map(|batch| batch.invoices)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Return the number of invoices grouped under `batch_id`, or `0` when no
    /// such batch exists.
    pub fn batch_size(env: Env, batch_id: Symbol) -> u32 {
        storage::batch(&env, &batch_id)
            .map(|batch| batch.invoices.len())
            .unwrap_or(0)
    }

    /// Return whether `invoice_id` is grouped under `batch_id`.
    pub fn is_in_batch(env: Env, batch_id: Symbol, invoice_id: Symbol) -> bool {
        match storage::batch(&env, &batch_id) {
            Some(batch) => batch.invoices.iter().any(|invoice| invoice == invoice_id),
            None => false,
        }
    }

    /// Return how many distinct batches have been started.
    pub fn total_batches(env: Env) -> u32 {
        storage::batch_count(&env)
    }
}
