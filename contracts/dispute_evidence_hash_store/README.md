# dispute-evidence-hash-store

A standalone Soroban contract that stores one SHA-256-sized commitment for each
dispute ID. Once committed, a dispute's hash cannot be replaced by another
commit through this contract.

The contract stores only the supplied 32-byte commitment. It does not receive
or verify evidence, calculate its hash, or authenticate a submitter. Integrating
applications must hash evidence off-chain and enforce authorization and dispute
ID ownership before accepting a commitment. Records use persistent Soroban
storage and therefore follow the network's storage-expiration and archival
lifecycle.

## Public API

```rust
commit_evidence(env: Env, dispute_id: Symbol, hash: BytesN<32>) -> Result<(), Error>
evidence_hash(env: Env, dispute_id: Symbol) -> Option<BytesN<32>>
```

`commit_evidence` stores the first hash for a dispute ID and returns
`Error::AlreadyCommitted` for every later commit to that ID. Distinct dispute
IDs have independent records. `evidence_hash` returns `None` when no record is
present and the original hash otherwise. The fixed-size `BytesN<32>` type
ensures that a stored value is exactly 32 bytes.

## Build and test

From the repository root:

```bash
cargo test --manifest-path contracts/dispute_evidence_hash_store/Cargo.toml
cargo clippy --manifest-path contracts/dispute_evidence_hash_store/Cargo.toml --all-targets -- -D warnings
cargo build --manifest-path contracts/dispute_evidence_hash_store/Cargo.toml --target wasm32v1-none --release
```

The final command requires the `wasm32v1-none` Rust target. This crate declares
its own Cargo workspace and is intentionally not a member of
`contracts/Cargo.toml`.