//! `payment-memo-length-guard` — standalone Soroban Stellar memo byte-length validator.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{check_memo_len, max_len};
pub use crate::types::{
    Error, MemoType, MAX_HASH_MEMO_BYTES, MAX_ID_MEMO_BYTES, MAX_TEXT_MEMO_BYTES,
};

use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct PaymentMemoLengthGuard;

#[contractimpl]
impl PaymentMemoLengthGuard {
    /// Return `true` if `byte_len` satisfies the Stellar byte-length constraint for `memo_type`.
    pub fn is_valid_memo_length(_env: Env, memo_type: MemoType, byte_len: u32) -> bool {
        logic::check_memo_len(memo_type, byte_len).is_ok()
    }

    /// Validate `byte_len` for `memo_type` or return a typed [`Error`].
    pub fn validate_memo_length(
        _env: Env,
        memo_type: MemoType,
        byte_len: u32,
    ) -> Result<(), Error> {
        logic::check_memo_len(memo_type, byte_len)
    }

    /// Return the maximum byte length permitted for `memo_type`.
    pub fn max_bytes_for(_env: Env, memo_type: MemoType) -> u32 {
        logic::max_len(memo_type)
    }
}
