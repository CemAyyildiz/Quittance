mod common;

use payment_memo_length_guard::MemoType;

#[test]
fn text_and_id_boundaries_are_respected() {
    let (_env, client) = common::setup();
    assert!(client.is_valid_memo_length(&MemoType::Text, &1));
    assert!(client.is_valid_memo_length(&MemoType::Text, &28));
    assert!(!client.is_valid_memo_length(&MemoType::Text, &29));
    assert_eq!(client.max_memo_length(&MemoType::Text), 28);
    assert_eq!(client.max_memo_length(&MemoType::Hash), 32);
}
