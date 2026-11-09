use super::setup;
use crate::MemoType;

#[test]
fn valid_lengths_for_all_memo_types_return_true() {
    let (_env, client) = setup();
    assert!(client.is_valid_memo_length(&MemoType::None, &0));
    assert!(client.is_valid_memo_length(&MemoType::Text, &15));
    assert!(client.is_valid_memo_length(&MemoType::Id, &8));
    assert!(client.is_valid_memo_length(&MemoType::Hash, &32));
    assert!(client.is_valid_memo_length(&MemoType::Return, &32));
}
