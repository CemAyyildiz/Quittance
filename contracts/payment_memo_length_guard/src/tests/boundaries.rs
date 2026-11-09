use super::setup;
use crate::{MemoType, MAX_HASH_MEMO_BYTES, MAX_ID_MEMO_BYTES, MAX_TEXT_MEMO_BYTES};

#[test]
fn exact_maximum_limits_pass_and_plus_one_fails() {
    let (_env, client) = setup();
    assert!(client.is_valid_memo_length(&MemoType::Text, &MAX_TEXT_MEMO_BYTES));
    assert!(!client.is_valid_memo_length(&MemoType::Text, &(MAX_TEXT_MEMO_BYTES + 1)));

    assert!(client.is_valid_memo_length(&MemoType::Id, &MAX_ID_MEMO_BYTES));
    assert!(!client.is_valid_memo_length(&MemoType::Id, &(MAX_ID_MEMO_BYTES + 1)));

    assert_eq!(client.max_bytes_for(&MemoType::Hash), MAX_HASH_MEMO_BYTES);
}
