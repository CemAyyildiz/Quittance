# `memo-commit-reveal`

Commit-reveal for payment memo hashes, implemented as a standalone Soroban
contract.

A payer **commits** the SHA-256 hash of a memo now, and **reveals** the memo
itself later. Until the reveal happens, the contract only knows a 32-byte
digest — the memo contents are never published at commit time.

This crate is a self-contained learning/utility primitive. It is **not** wired
into the Quittance frontend, backend, or any other contract in this
repository — it ships and is tested entirely on its own, exactly like the
other crates under `contracts/`. It is also *not* a member of the root
workspace; it declares its own standalone workspace in its `Cargo.toml`.

## What it does

| Step     | Action                                                              |
|----------|---------------------------------------------------------------------|
| Commit  | `commit(hash)` stores `hash` as a pending commitment.                 |
| Reveal  | `reveal(memo)` hashes `memo` with SHA-256 and looks for a match.     |
| Match   | The matching commitment is consumed and the call returns `true`.      |
| No match| The call returns `false`; **no** commitment is consumed.              |

Because a failed reveal does not consume anything, a payer may reveal early
with the wrong memo and try again later. Because a successful reveal consumes
the commitment, the same memo can never be revealed twice.

## Public API

### Free functions (pure, off-chain)

| Function         | Signature                                       | Returns                                  |
|------------------|-------------------------------------------------|------------------------------------------|
| `memo_hash`      | `fn memo_hash(memo: &[u8]) -> [u8; 32]`         | SHA-256 digest of the memo bytes.        |
| `memo_hash_hex`  | `fn memo_hash_hex(memo: &[u8]) -> [u8; 64]`      | The same digest as 64 lowercase ASCII hex bytes. |
| `MAX_MEMO_BYTES` | `const u32`                                     | `28` — Stellar's `MEMO_TEXT` limit.      |

`memo_hash_hex` returns a fixed-size byte array rather than a `String` so
that the helper stays allocation-free and can be used from a `no_std`
Soroban contract as well as from off-chain tooling.

### Contract entry points

| Method          | Signature                                              | Behaviour                                                                 |
|-----------------|--------------------------------------------------------|---------------------------------------------------------------------------|
| `commit`        | `fn commit(env: Env, hash: BytesN<32>) -> bool`          | `true` when the commitment was stored, `false` when it was already pending. |
| `reveal`        | `fn reveal(env: Env, memo: String) -> Result<bool, Error>` | `Ok(true)` on a match, `Ok(false)` otherwise.                             |
| `is_committed`  | `fn is_committed(env: Env, hash: BytesN<32>) -> bool`    | Whether a hash is currently pending.                                      |
| `pending_count` | `fn pending_count(env: Env) -> u32`                      | Number of pending commitments.                                            |
| `cancel`        | `fn cancel(env: Env, hash: BytesN<32>) -> bool`          | Cancels a pending commitment.                                             |

### Errors

| Variant      | Code | Meaning                                              |
|--------------|------|------------------------------------------------------|
| `MemoTooLong`| 1    | The memo was longer than `MAX_MEMO_BYTES` (28 bytes). |

## Why `String` and not `Symbol`?

The suggested API used a `Symbol` for the memo. A Soroban `Symbol` is a
32-character, `[a-zA-Z0-9_]`-only identifier, and — unlike a `String` — it
cannot be converted back into its raw bytes from inside a contract (the
`ToString` implementation only exists in host builds). Hashing a `Symbol`
on-chain would therefore hash the *symbol handle*, not the memo text, and the
digest would not match the off-chain SHA-256 of the memo.

This crate uses `String` so that the on-chain digest is byte-for-byte the
SHA-256 of the memo's UTF-8 bytes, exactly like the off-chain helper.

## Storage model

| Key                          | Storage    | Value                       |
|------------------------------|------------|-----------------------------|
| `DataKey::Commitment(hash)`  | persistent | `true` while the commitment is pending |
| `DataKey::Count`             | instance   | Number of pending commitments |

Commitments are keyed by hash, so several payers can commit concurrently
without overwriting each other.

## Events

| Event             | Topics | Data  |
|-------------------|--------|-------|
| `CommittedEvent`  | `hash` | —     |
| `RevealedEvent`   | `hash` | —     |
| `CancelledEvent`  | `hash` | —     |

## Usage

```rust
use memo_commit_reveal::{memo_hash, memo_hash_hex, MemoCommitRevealClient};
use soroban_sdk::{testutils::Address as _, BytesN, Env, String};

let env = Env::default();
let contract_id = env.register(memo_commit_reveal::MemoCommitReveal, ());
let client = MemoCommitRevealClient::new(&env, &contract_id);

// The payer computes the digest off-chain and commits it.
assert_eq!(memo_hash_hex(b"INV-42").len(), 64);
let hash = BytesN::from_array(&env, &memo_hash(b"INV-42"));
assert!(client.commit(&hash));

// A wrong memo does not consume the commitment.
assert!(!client.reveal(&String::from_str(&env, "INV-43")));

// The right memo reveals it exactly once.
assert!(client.reveal(&String::from_str(&env, "INV-42")));
assert!(!client.reveal(&String::from_str(&env, "INV-42")));
```

## Tests

```bash
cargo test --manifest-path contracts/memo_commit_reveal/Cargo.toml
```

The suite is split across four integration test files plus a unit-test module:

| File                    | Focus                                                                                     |
|-------------------------|-------------------------------------------------------------------------------------------|
| `tests/happy_path.rs`   | Commit/reveal round-trip, replay protection, several pending commitments.                   |
| `tests/boundary.rs`     | Empty memo, exactly 28 bytes, 29 bytes rejected, all-zero hash, pending-count bookkeeping.  |
| `tests/failure.rs`      | Reveal without a commitment, wrong memo, duplicate commit, cancel of an unknown hash.       |
| `tests/scenario.rs`     | Out-of-order reveals, cancelled commitments, one memo matching one commitment.              |
| `src/test.rs`           | Unit tests for the contract lifecycle and the pure hash helper.                             |

## Building for wasm

```bash
# The Soroban environment requires `wasm32v1-none` on Rust 1.84+.
# On Rust 1.81 and older use `wasm32-unknown-unknown` instead.
rustup target add wasm32v1-none
cargo build \
  --manifest-path contracts/memo_commit_reveal/Cargo.toml \
  --target wasm32v1-none \
  --release
```

## Out of scope

- Wiring into the Quittance frontend, backend, or invoice/payment flow.
- Cross-contract calls to any other crate in this repository.
- Deployment scripts or testnet/mainnet deployment.
- Per-payer commitment namespaces — commitments are global in this primitive.
- Time-locked reveals, penalty bonds, or dispute handling.
- Changes to `contracts/Cargo.toml` — this crate stays a standalone
  workspace, like most crates under `contracts/`.

## License

MIT.
