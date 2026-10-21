# `payment-reference-uniqueness`

Global uniqueness for payment reference strings, implemented as a standalone
Soroban contract.

The contract keeps a registry of claimed references. The first caller to
claim a reference wins; every later attempt to claim the **same** reference
is rejected. Two payments can therefore never carry the same reference,
which is what makes a reference usable as an idempotency key.

This crate is a self-contained learning/utility primitive. It is **not** wired
into the Quittance frontend, backend, or any other contract in this
repository — it ships and is tested entirely on its own, exactly like the
other crates under `contracts/`. It is also *not* a member of the root
workspace; it declares its own standalone workspace in its `Cargo.toml`.

## What it does

| Call                | Result                                                        |
|---------------------|---------------------------------------------------------------|
| First claim         | `true` — the reference is now claimed, permanently.           |
| Any later claim     | `false` — the reference was already claimed.                  |
| `is_claimed` query  | `true` when the reference is in the registry.                  |

The registry is **global**: the reference stays claimed forever, and it does
not matter which account, contract, or transaction attempts the second
claim. There is no `release` operation on purpose — a reference that could
be released could be re-claimed, and the uniqueness guarantee would break.

## Public API

### Free functions (pure, off-chain)

| Function              | Signature                                            | Returns                                              |
|-----------------------|------------------------------------------------------|------------------------------------------------------|
| `is_valid_reference`  | `fn is_valid_reference(reference: &str) -> bool`      | Whether the reference can be a Soroban symbol.       |
| `has_valid_charset`  | `fn has_valid_charset(reference: &str) -> bool`      | Whether the reference only uses the allowed alphabet. |
| `MAX_REFERENCE_LEN`   | `const usize`                                        | `32` — the Soroban symbol length limit.              |

### Contract entry points

| Method                   | Signature                                                        | Behaviour                                                        |
|--------------------------|------------------------------------------------------------------|------------------------------------------------------------------|
| `claim_reference`        | `fn claim_reference(env: Env, reference: Symbol) -> bool`         | `true` when the reference was free, `false` when it was taken.    |
| `claim_reference_checked`| `fn claim_reference_checked(env: Env, reference: Symbol) -> Result<(), Error>` | Same claim, but reports conflicts as a contract error. |
| `is_claimed`             | `fn is_claimed(env: Env, reference: Symbol) -> bool`               | Whether the reference is in the registry.                         |
| `claimed_count`          | `fn claimed_count(env: Env) -> u32`                               | Number of claimed references.                                     |

### Errors

| Variant         | Code | Meaning                                              |
|-----------------|------|------------------------------------------------------|
| `AlreadyClaimed`| 1    | The reference had already been claimed by an earlier call. |

## Reference format

References are Soroban `Symbol`s, which means:

| Rule                | Detail                                                        |
|---------------------|---------------------------------------------------------------|
| Alphabet            | `a-z`, `A-Z`, `0-9`, and `_` only.                            |
| Maximum length      | 32 characters.                                                |
| Case sensitivity    | `INV_1` and `inv_1` are **different** references.             |
| Empty string        | Allowed — it is a valid (if unusual) reference.                |

A reference containing a `-` (for example `INV-1`) cannot be represented as
a `Symbol` at all: the host rejects it with `InvalidInput`. Use underscores
instead. A reference longer than 32 characters is rejected the same way.

The `is_valid_reference` helper applies exactly these rules off-chain, so a
caller can reject a bad reference before submitting a transaction.

## Storage model

| Key                   | Storage    | Value                        |
|-----------------------|------------|------------------------------|
| `DataKey::Claim(ref)` | persistent | `true` while the reference is claimed |
| `DataKey::Count`      | instance   | Number of claimed references |

Claims live in persistent storage, so the registry survives instance
rollovers.

## Events

| Event                 | Topics      | Data |
|-----------------------|-------------|------|
| `ReferenceClaimedEvent`| `reference`| —    |

## Usage

```rust
use payment_reference_uniqueness::{
    PaymentReferenceUniqueness, PaymentReferenceUniquenessClient,
};
use soroban_sdk::{Env, Symbol};

let env = Env::default();
let contract_id = env.register(PaymentReferenceUniqueness, ());
let client = PaymentReferenceUniquenessClient::new(&env, &contract_id);

let reference = Symbol::new(&env, "INV_1");

// The first claim wins.
assert!(client.claim_reference(&reference));

// A replayed payment with the same reference is rejected.
assert!(!client.claim_reference(&reference));
assert!(client.is_claimed(&reference));
assert_eq!(client.claimed_count(), 1);
```

The checked variant reports the conflict as a contract error instead of a
boolean:

```rust
use payment_reference_uniqueness::Error;

let result = client.try_claim_reference_checked(&reference);
// `Err(Ok(Error::AlreadyClaimed))` for a duplicate reference.
assert!(result.is_err());
```

## Tests

```bash
cargo test --manifest-path contracts/payment_reference_uniqueness/Cargo.toml
```

The suite is split across four integration test files plus a unit-test module:

| File                    | Focus                                                                                     |
|-------------------------|-------------------------------------------------------------------------------------------|
| `tests/happy_path.rs`   | First claims succeed, several references are claimed independently.                       |
| `tests/boundary.rs`     | 32-character reference, empty reference, case sensitivity, underscores, over-long rejection. |
| `tests/failure.rs`      | Duplicate claims rejected, conflict reported as an error, registry unchanged on failure.    |
| `tests/scenario.rs`     | The registry is global, interleaved claims, repeated attempts claim exactly once.         |
| `src/test.rs`           | Unit tests for the claim/checked/query surface and the reference helpers.                |

## Building for wasm

```bash
# The Soroban environment requires `wasm32v1-none` on Rust 1.84+.
# On Rust 1.81 and older use `wasm32-unknown-unknown` instead.
rustup target add wasm32v1-none
cargo build \
  --manifest-path contracts/payment_reference_uniqueness/Cargo.toml \
  --target wasm32v1-none \
  --release
```

## Out of scope

- Wiring into the Quittance frontend, backend, or invoice/payment flow.
- Cross-contract calls to any other crate in this repository.
- Deployment scripts or testnet/mainnet deployment.
- Releasing a claim, per-payer namespaces, or reference expiry.
- Storing arbitrary-length references — the `Symbol` type caps references at
  32 characters of `[a-zA-Z0-9_]`.
- Changes to `contracts/Cargo.toml` — this crate stays a standalone
  workspace, like most crates under `contracts/`.

## License

MIT.
