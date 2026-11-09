use super::setup;
use crate::{Error, MemoType};

#[test]
fn oversize_and_short_hash_memos_return_typed_errors() {
    let (_env, client) = setup();
    assert_eq!(
        client.try_validate_memo_length(&MemoType::Text, &29),
        Err(Ok(Error::MemoTooLong))
    );
    assert_eq!(
        client.try_validate_memo_length(&MemoType::None, &1),
        Err(Ok(Error::MemoTooLong))
    );
    assert_eq!(
        client.try_validate_memo_length(&MemoType::Hash, &16),
        Err(Ok(Error::InvalidExactLength))
    );
}
