mod common;

use payment_memo_length_guard::MemoType;

#[test]
fn valid_lengths_for_all_memo_types_pass() {
    let (_env, client) = common::setup();
    assert!(client.is_valid_memo_length(&MemoType::None, &0));
    assert!(client.is_valid_memo_length(&MemoType::Text, &12));
    assert!(client.is_valid_memo_length(&MemoType::Id, &8));
    assert!(client.is_valid_memo_length(&MemoType::Hash, &32));
    assert!(client.is_valid_memo_length(&MemoType::Return, &32));
}
