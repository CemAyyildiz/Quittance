# quittance-data-key-prefix

Pure helper crate for building **upgrade-safe** storage-key prefixes
for Soroban contracts that use **instance** or **persistent** storage.

## Why prefixing?

A Soroban contract's storage namespace (`instance` / `persistent`) is
shared across all versions of the contract. If v1 stores a value at key
`"balance"` and v2 stores a different value at key `"balance"`, the
upgrade silently reads corrupt data at worst, or requires a complex
migration at best.

By prefixing every key with a **namespace string** (e.g. `"v1:settings"`)
that encodes the version and/or module, an upgrade can introduce new
namespaced keys while the old keys remain untouched — old data is
structurally unreachable by new code unless the migration explicitly
reads and re-writes it under the new prefix.

## The 0x00 marker byte

`prefixed` reserves the **first byte** of every key as a fixed `0x00`
marker. The marker is a deliberate, documented part of the key layout
and is reserved for future upgrade signalling: a future version could
bump the marker (e.g. to `0x01`) to switch the key scheme — hashing,
a versioned envelope, a different encoding — while remaining
unambiguous with every key produced by this version of the builder.

`raw_prefixed` produces keys **without** the leading marker byte, for
callers that want a simpler layout and accept that a future upgrade
must be aware of the raw-byte namespace contract.

## Empty namespaces are rejected

Both builders return `None` when the namespace is empty. Contracts
must choose a **non-empty** prefix for every key they store — an
empty namespace would collapse every key to the same bytes (or, for
`prefixed`, a lone `0x00`), defeating the collision avoidance that
prefixing exists to provide.

## Usage

```rust
use quittance_data_key_prefix::{prefixed, raw_prefixed};

// Instance-level key for the admin address in v1 of the contract.
let admin_key = prefixed("v1:admin").expect("non-empty prefix");
env.storage().instance().set(&admin_key, &admin_addr);

// Persistent key for user balances.
let balance_key = prefixed("v1:balance").expect("non-empty prefix");
env.storage().persistent().set(&balance_key, &balance);

// A simpler layout without the marker byte.
let settings_key = raw_prefixed("v1:settings").expect("non-empty prefix");
```

## API

| Function | Description |
|---|---|
| `prefixed(namespace: &str) -> Option<Vec<u8>>` | Prepends the reserved `0x00` marker byte to the namespace's UTF-8 bytes. Returns `None` when `namespace` is empty. |
| `raw_prefixed(namespace: &str) -> Option<Vec<u8>>` | Returns the namespace's UTF-8 bytes unchanged, without the marker byte. Returns `None` when `namespace` is empty. |

Both return values are suitable as keys in
`env.storage().instance().set(...)` and
`env.storage().persistent().set(...)`.

## Collision model

A prefix **collision** happens when two logically distinct contract
concepts produce the same key bytes. This crate uses the raw namespace
string itself as the key — **no hashing** — so collisions can only
occur if two namespaces are byte-for-byte identical, which is a naming
bug, not a systematic risk.

## Out of scope

- **Hashing namespaces.** The raw namespace bytes are the key. If a
  future version needs a hashed or otherwise derived key scheme, it
  can bump the reserved marker byte to opt in without colliding with
  keys built by this version.

## Running the tests

This crate is dependency-free and standalone (it is not part of the
root `contracts` workspace):

```bash
cd contracts/data_key_prefix
cargo test
```

## License

MIT
