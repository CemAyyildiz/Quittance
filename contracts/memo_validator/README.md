# `memo-validator`

Soroban contract that validates Stellar text memos: **max 28 bytes** and
**printable ASCII charset only** (`0x20`–`0x7E`).

This crate is a stateless, dependency-light Soroban contract deployable
on-chain. It owns the single definition of "a valid Stellar text memo"
so that other Quittance contracts can cross-call
[`MemoValidator::validate`] instead of repeating the check.

> **Not wired into the Next.js or Express MVP demos.** This contract
> exists as a reusable building block for on-chain memo validation.
> Off-chain consumers should use the same rules without calling the
> contract.

## Rules

| Rule          | Constraint                                      |
|---------------|-------------------------------------------------|
| Length        | ≤ 28 bytes ([`MAX_MEMO_BYTES`])                 |
| Charset       | Printable ASCII only: `0x20` (space) — `0x7E` (~) |

An **empty** memo (length 0) is valid — Stellar transactions may omit
the memo field entirely.

Control characters (`0x00`–`0x1F`), DEL (`0x7F`), and bytes ≥ `0x80`
are rejected.

## API

| Item                          | Signature                            | Returns  |
|-------------------------------|--------------------------------------|----------|
| [`MemoValidator::validate`]   | `fn validate(env: Env, memo: String) → bool` | `true` when the memo passes both rules |
| [`MAX_MEMO_BYTES`]            | `const u32`                          | `28`     |

## Usage (Soroban CLI)

```ignore
# Deploy once:
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/memo_validator.wasm \
  --source <SECRET_KEY> \
  --network testnet

# Cross-call from another contract or invoke directly:
soroban contract invoke \
  --id <CONTRACT_ID> \
  -- \
  validate \
  --memo "INV-42"
```

## Examples

```rust
use memo_validator::{MemoValidator, MAX_MEMO_BYTES};

// An invoice reference is valid.
assert!(MemoValidator::validate(env, String::from_str(&env, "INV-001")));

// 28 bytes is accepted.
let ok = "a".repeat(MAX_MEMO_BYTES as usize);
assert!(MemoValidator::validate(env, String::from_str(&env, &ok)));

// 29 bytes is rejected.
let too_long = "a".repeat(29);
assert!(!MemoValidator::validate(env, String::from_str(&env, &too_long)));

// Non-printable bytes are rejected.
assert!(!MemoValidator::validate(env, String::from_str(&env, "bad\tmemo")));
```

## Scope and non-goals

In scope:

- Length rule: ≤ 28 bytes.
- Charset rule: printable ASCII only (`0x20`–`0x7E`).
- Unit-test coverage of happy path, boundary, and rejection cases.
- Stateless contract: no storage, no constructor.

Out of scope:

- Frontend or backend integration.
- Other contract crates.
- Changing `contracts/Cargo.toml` (workspace extension is owned by #57).
- Built-in error codes — callers that need a specific error should wrap
  the boolean result.

## Running the tests

Requires a Rust toolchain with the `wasm32-unknown-unknown` target
(install via `rustup target add wasm32-unknown-unknown`):

```bash
cd contracts/memo_validator
cargo test
```
