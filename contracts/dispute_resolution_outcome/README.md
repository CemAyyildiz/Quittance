# Dispute Resolution Outcome (`dispute_resolution_outcome`)

Standalone Soroban contract primitive recording the immutable, write-once outcome (`FavorPayer`, `FavorSeller`, `Split`) of a resolved dispute.

## Public API

- `resolve(env: Env, dispute_id: Symbol, outcome: Outcome) -> Result<(), DisputeOutcomeError>`
- `outcome_of(env: Env, dispute_id: Symbol) -> Option<Outcome>`
- `is_resolved(env: Env, dispute_id: Symbol) -> bool`
- `require_outcome(env: Env, dispute_id: Symbol) -> Result<Outcome, DisputeOutcomeError>`

## Build & Test

```bash
cargo test --manifest-path contracts/dispute_resolution_outcome/Cargo.toml
cargo clippy --manifest-path contracts/dispute_resolution_outcome/Cargo.toml --all-targets -- -D warnings
```
