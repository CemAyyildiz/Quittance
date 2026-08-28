# memo-collision (test-only stub)

> **⚠️ Test-only in-memory stub — NOT a production uniqueness system.**

This crate is a lightweight, ephemeral guard that detects duplicate Soroban
memo strings. It exists to support **unit tests and local development** of the
Quittance invoice-correlation flow. Do not rely on it for any real
collision-avoidance in production.

## What it does

`MemoCollisionGuard` tracks previously seen memo strings in a process-local
`HashSet<String>` and flags duplicates via `MemoCollisionGuard::note`. Two
memos collide only when they are byte-for-byte identical (exact, case-sensitive
comparison).

See `src/lib.rs` for the full API and doc examples.

## Limitations

This stub is intentionally minimal. It is **not** a safe foundation for
production memo uniqueness:

- **Volatile** — State lives on the heap and is lost the moment the process
  exits. There is no recovery after a restart.
- **Not distributed** — Each process owns its own guard. Multiple replicas,
  serverless invocations, or worker threads (outside a shared instance) do
  **not** share state, so collisions across processes are invisible.
- **No persistence** — Nothing is written to disk, a database, or the Stellar
  ledger. History cannot be queried after the fact.
- **No eviction / TTL** — The guard grows monotonically with every unique memo
  inserted; there is no expiry or memory bound.

For production-grade uniqueness you would need a shared, durable store
(e.g. Postgres with a unique constraint, or a Soroban contract) — out of scope
for this stub.

## Testing

From this directory:

```bash
cargo test
```

This runs the in-crate unit tests covering construction, collision detection,
`has_seen`, `clear`, `len`/`is_empty`, and edge cases (case sensitivity,
unicode, empty strings, large volumes).

> Because the guard is in-memory and not distributed, these tests validate
> behaviour **within a single process only**. They do not exercise cross-process
> or persistent-uniqueness guarantees — those are explicitly out of scope here.
