# meta_info

Stateless Soroban contract that exposes Quittance project identity and version
strings for off-chain tooling and on-chain introspection.

## Purpose

Other contracts and off-chain tools can call `name()` and `version()` to
identify this contract and determine which version is deployed — without
needing access to the Wasm hash or deployment transaction.

The contract is **stateless**: both methods return compile-time constants, so
there is no storage cost and no initialization step.

## Entry points

| Method | Returns | Description |
|--------|---------|-------------|
| `name()` | `String` | Canonical project name (`"Quittance"`). |
| `version()` | `String` | Current semver version (e.g. `"0.1.0"`). |

### `name()`

Returns the fixed project name `"Quittance"` as a Soroban `String`.

### `version()`

Returns the semver string from the `CONTRACT_VERSION` constant in
`src/lib.rs`. Bump that constant when the contract logic changes in a material
way.

## Semver bump policy

This contract follows [Semantic Versioning 2.0.0](https://semver.org/):

| Change type | Bump | Example |
|-------------|------|---------|
| Breaking API change (method removed, return type changed) | **MAJOR** (`X.0.0`) | `0.1.0` → `1.0.0` |
| New method added, non-breaking | **MINOR** (`x.Y.0`) | `0.1.0` → `0.2.0` |
| Doc typo fix, internal refactor, no ABI change | **PATCH** (`x.y.Z`) | `0.1.0` → `0.1.1` |

### When to bump

- Bump **MAJOR** if a caller would break by upgrading (e.g. `name()` now
  returns a different string, or `version()` is removed).
- Bump **MINOR** when a new entry point is added (callers are unaffected).
- Bump **PATCH** for documentation-only or toolchain-only changes.

### How to bump

1. Update `CONTRACT_VERSION` in `contracts/meta_info/src/lib.rs`.
2. Keep `version` in `contracts/meta_info/Cargo.toml` aligned for tooling.

## Usage

```rust
use soroban_sdk::Env;

let client = MetaInfoClient::new(&env, &contract_id);
assert_eq!(client.name().to_string(), "Quittance");
assert_eq!(client.version().to_string(), "0.1.0");
```

## Testing

```bash
cargo test -p meta-info
```

Tests verify:

- `name()` returns `"Quittance"`.
- `version()` returns the exact semver string from `CONTRACT_VERSION`.
- Both entry points are callable and return non-empty values.
