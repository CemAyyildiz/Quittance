//! `payment-memo-length-guard` — standalone Soroban contract validating
//! Stellar memo byte lengths per memo type.

#![no_std]
#![deny(unsafe_code)]

pub mod types;
pub mod validator;

pub use crate::types::{
    MemoLengthError, MemoType, HASH_MEMO_BYTES, ID_MEMO_BYTES, MAX_TEXT_MEMO_BYTES,
};
pub use crate::validator::{max_bytes_for, validate_memo_length};

use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct PaymentMemoLengthGuard;

#[contractimpl]
impl PaymentMemoLengthGuard {
    /// Returns `true` if `byte_len` satisfies the Stellar protocol rules for `memo_type`.
    pub fn is_valid_memo_length(_env: Env, memo_type: MemoType, byte_len: u32) -> bool {
        validate_memo_length(memo_type, byte_len).is_ok()
    }

    /// Strict counterpart returning a [`MemoLengthError`] when `byte_len` is invalid.
    pub fn require_valid_memo_length(
        _env: Env,
        memo_type: MemoType,
        byte_len: u32,
    ) -> Result<(), MemoLengthError> {
        validate_memo_length(memo_type, byte_len)
    }

    /// Returns the maximum byte length allowed for `memo_type`.
    pub fn max_memo_length(_env: Env, memo_type: MemoType) -> u32 {
        max_bytes_for(memo_type)
    }
}
