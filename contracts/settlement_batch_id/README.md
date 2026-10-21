# settlement-batch-id

Groups multiple invoice ids under one settlement batch id, with a maximum batch size.

This crate is a self-contained Soroban primitive. A settlement run settles several invoices
together; this contract records which invoices belong to which batch and enforces the cap on
how many invoices a single batch may hold.

The crate is **not** wired into the frontend, backend, or any other contract in this repo. It
ships and is tested entirely on its own, matching how most existing crates under `contracts/`
are structured (standalone `Cargo.toml`, not a member of the root workspace).

## What it does

| Function | Signature | Meaning |
|----------|-----------|---------|
| `start_batch` | `fn(Env, Vec<Symbol>, u32) -> Result<Symbol, BatchError>` | Group invoice ids into a batch and return the batch id. |
| `batch_invoices` | `fn(Env, Symbol) -> Vec<Symbol>` | Read the invoices grouped under a batch (empty when unknown). |
| `batch_size` | `fn(Env, Symbol) -> u32` | Read the invoice count of a batch (0 when unknown). |
| `is_in_batch` | `fn(Env, Symbol, Symbol) -> bool` | Whether an invoice is grouped under a batch. |
| `total_batches` | `fn(Env) -> u32` | How many distinct batches have been started. |

### Example

```rust
use settlement_batch_id::{SettlementBatchId, SettlementBatchIdClient};
use soroban_sdk::{symbol_short, vec, Env};

let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(SettlementBatchId, ());
let client = SettlementBatchIdClient::new(&env, &contract_id);

let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];
let batch_id = client.start_batch(&invoices, &5);

assert!(client.is_in_batch(&batch_id, &symbol_short!("INV1")));
assert_eq!(client.batch_size(&batch_id), 2);
```

## Rules

1. **Non-empty** — a batch groups at least one invoice.
2. **Bounded** — the batch may not hold more invoices than `max_size`.
3. **No duplicates** — an invoice id appears at most once in a batch.
4. **Bounded cap** — `max_size` is at least 1 and at most `MAX_BATCH_SIZE` (10).

## Batch ids

The batch id is derived from the batch contents, not from a counter:

1. The invoice ids are sorted, so the order they are supplied in does not matter.
2. They are joined with a `|` separator, which cannot occur inside a `Symbol`, so
   `["A", "BC"]` and `["AB", "C"]` hash differently.
3. The joined bytes are hashed with SHA-256, and the first 16 hex characters of the digest are
   rendered as the id, prefixed with `B` — for example `B3f8a1c0d2e4b5a6`.

Two consequences follow:

- **Grouping is deterministic** — the same set of invoices always yields the same batch id.
- **Grouping is idempotent** — starting a batch that already exists returns the same id instead
  of creating a second copy, so a retried transaction cannot double-group invoices.

## Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `BatchError::EmptyBatch` | `1` | A settlement batch must contain at least one invoice. |
| `BatchError::InvalidMaxSize` | `2` | Maximum batch size must be at least one. |
| `BatchError::MaxSizeTooLarge` | `3` | Maximum batch size exceeds the supported limit. |
| `BatchError::BatchTooLarge` | `4` | Batch contains more invoices than its maximum size. |
| `BatchError::DuplicateInvoice` | `5` | The same invoice id cannot appear twice in one batch. |

Each variant carries a stable `#[repr(u32)]` discriminant, and `message()` returns a stable
English description for off-chain tooling.

## Layout

```
src/lib.rs        contract entry points
src/batch.rs      validation, ordering, and deterministic batch-id derivation
src/storage.rs    instance-storage accessors
src/types.rs      storage keys, batch record, and error codes
tests/            happy path, edge/boundary, failure, and scenario suites
```

## Building and testing

This crate requires the [Soroban SDK](https://github.com/stellar/rs-soroban-sdk). Install Rust
from <https://rustup.rs> if missing, then:

```bash
cargo test --manifest-path contracts/settlement_batch_id/Cargo.toml
cargo clippy --manifest-path contracts/settlement_batch_id/Cargo.toml --all-targets -- -D warnings
```

The crate declares its own `[workspace]`, so it is deliberately **not** listed in
`contracts/Cargo.toml`'s workspace `members`. Building it therefore never disturbs the other
contracts in the repo.

## License

MIT — see `LICENSE` at the repository root.
