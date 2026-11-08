mod common;

use payment_memo_length_guard::MemoType;

#[test]
fn invoice_reference_memo_switching_flow() {
    let (_env, client) = common::setup();
    // Standard 16-byte UUID text memo vs 32-byte SHA-256 receipt hash memo
    client.require_valid_memo_length(&MemoType::Text, &16);
    client.require_valid_memo_length(&MemoType::Hash, &32);
    client.require_valid_memo_length(&MemoType::Return, &32);
}
