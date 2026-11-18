# Quittance - Dispute Resolution Outcome Contract

Standalone Soroban contract crate implementing a write-once dispute resolution outcome primitive.

## Concept

Records the final, immutable outcome of a resolved dispute (`FavorPayer`, `FavorSeller`, `Split`) for a given dispute ID. A dispute ID can only ever be resolved once; subsequent resolution attempts are permanently rejected.

## Public Interface

```rust
pub fn resolve(env: Env, dispute_id: Symbol, outcome: Outcome) -> Result<(), DisputeError>;
pub fn outcome_of(env: Env, dispute_id: Symbol) -> Option<Outcome>;
pub fn is_resolved(env: Env, dispute_id: Symbol) -> bool;
```

## Building and Testing

```bash
cargo build --target wasm32-unknown-unknown --release
cargo test
cargo clippy --all-targets -- -D warnings
```
