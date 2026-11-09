//! Memo byte-length rules for `payment-memo-length-guard`.

use crate::types::{
    Error, MemoType, MAX_HASH_MEMO_BYTES, MAX_ID_MEMO_BYTES, MAX_TEXT_MEMO_BYTES,
};

#[must_use]
pub const fn max_len(memo_type: MemoType) -> u32 {
    match memo_type {
        MemoType::None => 0,
        MemoType::Text => MAX_TEXT_MEMO_BYTES,
        MemoType::Id => MAX_ID_MEMO_BYTES,
        MemoType::Hash | MemoType::Return => MAX_HASH_MEMO_BYTES,
    }
}

pub const fn check_memo_len(memo_type: MemoType, byte_len: u32) -> Result<(), Error> {
    let limit = max_len(memo_type);
    if byte_len > limit {
        return Err(Error::MemoTooLong);
    }
    match memo_type {
        MemoType::Hash | MemoType::Return if byte_len != MAX_HASH_MEMO_BYTES => {
            Err(Error::InvalidExactLength)
        }
        _ => Ok(()),
    }
}
