//! Memo types and error definitions for `payment-memo-length-guard`.

use soroban_sdk::{contracterror, contracttype};

pub const MAX_TEXT_MEMO_BYTES: u32 = 28;
pub const ID_MEMO_BYTES: u32 = 8;
pub const HASH_MEMO_BYTES: u32 = 32;

/// Stellar transaction memo variants.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MemoType {
    None,
    Text,
    Id,
    Hash,
    Return,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MemoLengthError {
    MemoTooLong = 1,
    EmptyMemoNotAllowed = 2,
    ExactLengthRequired = 3,
}
