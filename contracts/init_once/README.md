# `init_once`

Minimal Soroban reference contract for deploy-time administrator
initialization. It stores an administrator exactly once and exposes read-only
methods for inspecting the initialization state.

## Deploy

Build the contract from the repository's `contracts/` directory:

```sh
cargo build --target wasm32-unknown-unknown --release --package init_once
```

Deploy the resulting WASM with the Soroban CLI and pass the administrator's
Stellar address to the constructor:

```sh
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/init_once.wasm \
  --network testnet \
  --source-account ADMIN_SECRET_KEY \
  -- --admin ADMIN_ADDRESS
```

The `-- --admin ADMIN_ADDRESS` arguments invoke `__constructor` during
deployment. The constructor argument is the address returned by `admin()`.
Replace the network, source account, and address values with those for the
target network.

## Public API

| Function | Returns | Purpose |
| --- | --- | --- |
| `__constructor(admin)` | - | Stores `admin` and marks the contract initialized. |
| `admin()` | `Address` | Returns the administrator stored at initialization. |
| `is_initialized()` | `bool` | Reports whether initialization has completed. |

## Initialization behavior

- Before initialization, `is_initialized()` returns `false`.
- The first `__constructor(admin)` call stores the address and makes
  `is_initialized()` return `true`.
- A second `__constructor(...)` call panics with `already initialized`.
- Initialization is deploy-time-only. The contract has no public setter, so
  changing the administrator requires deploying a new contract instance.

## Test

```sh
cargo test -p init_once
```

The tests cover successful first initialization, retrieval of the stored admin,
the initialized state, and rejection of double initialization.

## License

MIT - see `LICENSE` at the repository root.