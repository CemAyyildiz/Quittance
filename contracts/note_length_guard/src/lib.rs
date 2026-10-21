#![no_std]
#![deny(unsafe_code)]

//! Stateless Soroban contract for validating optional invoice notes.
//!
//! Notes are measured in UTF-8 bytes and may contain printable ASCII only.
//! An empty note is valid, which lets callers represent an omitted note.

mod charset;
mod validation;

use soroban_sdk::{contract, contractimpl, Env, String};

/// Stateless validator for invoice notes.
#[contract]
pub struct NoteLengthGuard;

#[contractimpl]
impl NoteLengthGuard {
    /// Returns whether `note` is printable ASCII and no longer than `max_len` bytes.
    ///
    /// The empty note is valid, and the configured limit is inclusive.
    pub fn is_valid_note(_env: Env, note: String, max_len: u32) -> bool {
        let bytes = note.to_bytes();
        validation::is_valid_note(&bytes, max_len)
    }
}
