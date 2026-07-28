# quittance-storage-ttl

Soroban helper crate wrapping `extend_ttl`-style bumps for instance,
persistent, and temporary data keys.

## Overview

Soroban ledger entries have a finite TTL (time-to-live). Once the TTL
expires, the entry is archived and inaccessible until restored. This
crate provides thin wrappers around the SDK `extend_ttl` methods so
that every Quittance contract uses the same bump logic with consistent
threshold and ledger-count defaults.

## Usage

```rust
use soroban_sdk::{Env, Symbol};
use quittance_storage_ttl;

let env: Env = /* … */;
let key = Symbol::new(&env, "invoice_data");

// Bump a single persistent key
quittance_storage_ttl::bump_persistent(&env, &key, 100, 500);

// Bump the entire instance storage
quittance_storage_ttl::bump_instance(&env, 100, 500);

// Bump a temporary key
quittance_storage_ttl::bump_temporary(&env, &key, 100, 500);
```

## API

| Function | Storage type | Parameters |
|---|---|---|
| `bump_instance` | Instance | `env, threshold, ledgers_to_add` |
| `bump_persistent` | Persistent | `env, key, threshold, ledgers_to_add` |
| `bump_temporary` | Temporary | `env, key, threshold, ledgers_to_add` |

- **threshold**: minimum ledgers remaining before triggering extension.
- **ledgers_to_add**: number of additional ledgers to append to the
  current TTL.

## License

MIT
