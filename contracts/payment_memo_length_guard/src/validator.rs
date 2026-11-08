//! Pure validation rules for Stellar memo byte lengths.

use crate::types::{
    MemoLengthError, MemoType, HASH_MEMO_BYTES, ID_MEMO_BYTES, MAX_TEXT_MEMO_BYTES,
};

pub fn max_bytes_for(memo_type: MemoType) -> u32 {
    match memo_type {
        MemoType::None => 0,
        MemoType::Text => MAX_TEXT_MEMO_BYTES,
        MemoType::Id => ID_MEMO_BYTES,
        MemoType::Hash | MemoType::Return => HASH_MEMO_BYTES,
    }
}

pub fn validate_memo_length(memo_type: MemoType, byte_len: u32) -> Result<(), MemoLengthError> {
    match memo_type {
        MemoType::None => {
            if byte_len == 0 {
                Ok(())
            } else {
                Err(MemoLengthError::MemoTooLong)
            }
        }
        MemoType::Text => {
            if byte_len == 0 {
                Err(MemoLengthError::EmptyMemoNotAllowed)
            } else if byte_len <= MAX_TEXT_MEMO_BYTES {
                Ok(())
            } else {
                Err(MemoLengthError::MemoTooLong)
            }
        }
        MemoType::Id => {
            if byte_len == 0 {
                Err(MemoLengthError::EmptyMemoNotAllowed)
            } else if byte_len <= ID_MEMO_BYTES {
                Ok(())
            } else {
                Err(MemoLengthError::MemoTooLong)
            }
        }
        MemoType::Hash | MemoType::Return => {
            if byte_len == HASH_MEMO_BYTES {
                Ok(())
            } else if byte_len > HASH_MEMO_BYTES {
                Err(MemoLengthError::MemoTooLong)
            } else {
                Err(MemoLengthError::ExactLengthRequired)
            }
        }
    }
}
