# contracts/network-passphrase

A small Soroban smart contract that exposes the two standard Stellar
network passphrases via read-only contract functions.

## Passphrases

| Function / Variant          | Passphrase                                             |
|-----------------------------|--------------------------------------------------------|
| `testnet_passphrase()`      | `Test SDF Network ; September 2015`                    |
| `public_passphrase()`       | `Public Global Stellar Network ; September 2015`       |
| `passphrase(&Network::Testnet)` | Same as `testnet_passphrase()`                      |
| `passphrase(&Network::Public)`  | Same as `public_passphrase()`                      |

## Public API

The contract exposes three read-only entry points:

| Function                           | Returns                                     |
|------------------------------------|---------------------------------------------|
| `testnet_passphrase(env)`          | `String` — the testnet passphrase           |
| `public_passphrase(env)`           | `String` — the public/mainnet passphrase    |
| `passphrase(env, network)`         | `String` — passphrase for the given `Network` variant |

## Why a contract?

Hard-coding passphrase strings inside other contracts works, but a
dedicated passphrase contract has two advantages:

1. **Single source of truth** — every contract that needs a passphrase
   can query this one contract, so a typo is fixed in one place.
2. **On-chain discoverability** — off-chain tools can read the
   passphrase from the contract without shipping their own copy of the
   string constants.

## Build and test

```sh
cd contracts/network_passphrase
cargo test
cargo build --target wasm32-unknown-unknown --release
```

## Scope guard

This crate owns **only** the files inside `contracts/network_passphrase/`.
It does not modify any file outside that directory.

## License

MIT — see `LICENSE` at the repository root.
