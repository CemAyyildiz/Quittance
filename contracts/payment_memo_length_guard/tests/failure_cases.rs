mod common;

use payment_memo_length_guard::{MemoLengthError, MemoType};

#[test]
fn oversized_or_wrong_size_memos_fail() {
    let (_env, client) = common::setup();
    assert_eq!(
        client.try_require_valid_memo_length(&MemoType::Text, &29),
        Err(Ok(MemoLengthError::MemoTooLong))
    );
    assert_eq!(
        client.try_require_valid_memo_length(&MemoType::Hash, &31),
        Err(Ok(MemoLengthError::ExactLengthRequired))
    );
    assert_eq!(
        client.try_require_valid_memo_length(&MemoType::None, &1),
        Err(Ok(MemoLengthError::MemoTooLong))
    );
}
