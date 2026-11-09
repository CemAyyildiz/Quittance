# `payment-memo-length-guard`

Standalone Soroban contract implementing a **Stellar memo byte-length validator**.

Pure validator enforcing the maximum byte length for each Stellar memo type (`None` = 0, `Text` = 28, `Id` = 8, `Hash` = 32, `Return` = 32) and rejecting any memo that exceeds its type's limit.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_valid_memo_length` | `fn(Env, memo_type: MemoType, byte_len: u32) -> bool` | Return `true` if `byte_len` is valid for `memo_type`. |
| `validate_memo_length` | `fn(Env, memo_type: MemoType, byte_len: u32) -> Result<(), Error>` | Fallible check returning `Error::MemoTooLong` or `Error::EmptyMemoNotAllowed`. |
| `max_bytes_for` | `fn(Env, memo_type: MemoType) -> u32` | Return the maximum allowed byte length for `memo_type`. |

## Build & Test

```bash
cargo test --manifest-path contracts/payment_memo_length_guard/Cargo.toml
cargo clippy --manifest-path contracts/payment_memo_length_guard/Cargo.toml --all-targets -- -D warnings
```
