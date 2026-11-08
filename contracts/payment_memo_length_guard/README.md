# payment-memo-length-guard

Stellar memo byte-length validator for Quittance on Stellar Soroban.

Enforces the canonical Stellar protocol byte-length bounds for each memo kind (`None`: `0`, `Text`: `1..=28`, `Id`: `8` bytes / u64, `Hash`: exact `32` bytes, `Return`: exact `32` bytes).

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_valid_memo_length` | `fn(Env, memo_type: MemoType, byte_len: u32) -> bool` | Returns `true` if `byte_len` is valid for `memo_type`. |
| `require_valid_memo_length` | `fn(Env, memo_type: MemoType, byte_len: u32) -> Result<(), MemoLengthError>` | Returns `Ok(())` when valid or a specific `MemoLengthError`. |
| `max_memo_length` | `fn(Env, memo_type: MemoType) -> u32` | Returns the maximum allowed byte length for `memo_type`. |

## Build & Test

```bash
cargo test --manifest-path contracts/payment_memo_length_guard/Cargo.toml
cargo clippy --manifest-path contracts/payment_memo_length_guard/Cargo.toml --all-targets -- -D warnings
```
