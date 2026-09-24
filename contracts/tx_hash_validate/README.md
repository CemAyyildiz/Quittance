# tx-hash-validate

Pure Soroban helper crate: validate 64-character hex-encoded Soroban
transaction hashes.

## Purpose

Soroban (and Stellar) transaction hashes are SHA-256 digests (32 bytes)
conventionally rendered as 64 lowercase hex characters. This crate
provides a simple, dependency-light validator that checks:

- **Length**: exactly 64 characters.
- **Character set**: every character is a valid hex digit (`0-9`, `a-f`, `A-F`).

## API

| Function              | Returns               | Description                                  |
|-----------------------|-----------------------|----------------------------------------------|
| `validate_tx_hash`    | `Result<(), TxHashError>` | Returns the specific error on failure.   |
| `is_valid_tx_hash`    | `bool`                | Convenience wrapper; returns `true` on valid. |

## Usage

```rust
use tx_hash_validate::{is_valid_tx_hash, validate_tx_hash, TxHashError};

// Valid 64-char hex hash
let hash = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
assert!(is_valid_tx_hash(hash));

// Rejected: too short
assert_eq!(validate_tx_hash("abc"), Err(TxHashError::InvalidLength));

// Rejected: invalid hex character 'g'
let bad = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678g";
assert_eq!(validate_tx_hash(bad), Err(TxHashError::InvalidCharacter));
```

## Testing

```bash
cd contracts/tx_hash_validate && cargo test
```

## License

MIT
