use super::setup;
use crate::MemoType;

#[test]
fn empty_text_and_id_memos_are_permitted_while_return_requires_32_bytes() {
    let (_env, client) = setup();
    assert!(client.is_valid_memo_length(&MemoType::Text, &0));
    assert!(client.is_valid_memo_length(&MemoType::Id, &0));
    assert!(!client.is_valid_memo_length(&MemoType::Return, &0));
}
