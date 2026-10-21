//! Pure batch logic: validation, ordering, and deterministic batch-id
//! derivation.
//!
//! Kept free of `Env` (except where the hash needs the host) so the rules can
//! be unit-tested on the host target.

use crate::types::{BatchError, BATCH_ID_HEX_LEN, MAX_BATCH_SIZE};
use alloc::{string::String, string::ToString, vec::Vec};
use soroban_sdk::{Bytes, Env, Symbol};

/// The separator placed between invoice ids before hashing.
///
/// It cannot occur inside a `Symbol`, so two different sets of invoice ids can
/// never produce the same byte string.
const SEPARATOR: u8 = b'|';

/// The prefix every batch id carries.
const BATCH_ID_PREFIX: &str = "B";

/// Validate a batch definition.
///
/// The rules, in the order they are checked:
///
/// 1. `max_size` must be at least one and at most [`MAX_BATCH_SIZE`].
/// 2. The batch must contain at least one invoice.
/// 3. The batch must not contain more invoices than `max_size`.
/// 4. An invoice id may appear only once.
pub fn validate(invoices: &[Symbol], max_size: u32) -> Result<(), BatchError> {
    if max_size == 0 {
        return Err(BatchError::InvalidMaxSize);
    }
    if max_size > MAX_BATCH_SIZE {
        return Err(BatchError::MaxSizeTooLarge);
    }
    if invoices.is_empty() {
        return Err(BatchError::EmptyBatch);
    }
    if invoices.len() > max_size as usize {
        return Err(BatchError::BatchTooLarge);
    }
    if has_duplicates(invoices) {
        return Err(BatchError::DuplicateInvoice);
    }
    Ok(())
}

/// Whether an invoice id appears more than once.
pub fn has_duplicates(invoices: &[Symbol]) -> bool {
    let mut seen: Vec<&Symbol> = Vec::with_capacity(invoices.len());
    for invoice in invoices {
        if seen.contains(&invoice) {
            return true;
        }
        seen.push(invoice);
    }
    false
}

/// Return the invoice ids in a stable order.
///
/// The batch id is derived from the sorted ids, so grouping the same invoices
/// in a different order still yields the same batch.
pub fn sorted(invoices: &[Symbol]) -> Vec<Symbol> {
    let mut ordered: Vec<Symbol> = invoices.to_vec();
    ordered.sort();
    ordered
}

/// Build the byte string that is hashed to derive a batch id.
///
/// The sorted invoice ids are joined with a separator, so the input is
/// unambiguous: `["A", "BC"]` and `["AB", "C"]` hash differently.
pub fn id_preimage(invoices: &[Symbol]) -> Vec<u8> {
    let mut data: Vec<u8> = Vec::new();
    for invoice in sorted(invoices) {
        data.extend_from_slice(invoice.to_string().as_bytes());
        data.push(SEPARATOR);
    }
    data
}

/// Derive the batch id for a set of invoice ids.
///
/// The id is `B` followed by the first 16 hex characters of the SHA-256
/// digest of the sorted, separator-joined invoice ids. It is stable across
/// runs and machines, so the same invoices always group under the same batch.
pub fn derive_batch_id(env: &Env, invoices: &[Symbol]) -> Symbol {
    let data = id_preimage(invoices);
    let digest = env.crypto().sha256(&Bytes::from_slice(env, &data));
    let bytes = digest.to_array();

    let mut id = String::with_capacity(BATCH_ID_PREFIX.len() + BATCH_ID_HEX_LEN);
    id.push_str(BATCH_ID_PREFIX);
    for byte in bytes.iter().take(BATCH_ID_HEX_LEN / 2) {
        id.push(hex_digit(byte >> 4));
        id.push(hex_digit(byte & 0x0f));
    }
    Symbol::new(env, &id)
}

/// The hex digit for a nibble.
fn hex_digit(nibble: u8) -> char {
    match nibble {
        0..=9 => (b'0' + nibble) as char,
        _ => (b'a' + nibble - 10) as char,
    }
}
