# `quittance-proof-meta`

Pack/unpack a small proof metadata struct (amount, asset code, memo, tx hash
bytes) for Soroban payment proofs on Stellar.

This crate defines a single [`ProofMeta`](src/lib.rs) struct with a
deterministic binary encoding. Use `ProofMeta::pack` to serialize and
`ProofMeta::unpack` to deserialize.

## API

| Item                       | Meaning                                               |
|----------------------------|-------------------------------------------------------|
| `ProofMeta`                | Struct with `amount`, `asset_code`, `memo`, `tx_hash`.|
| `ProofMeta::pack()`        | Serialize to packed bytes (`Result<Vec<u8>>`).        |
| `ProofMeta::unpack(data)`  | Deserialize from packed bytes (`Result<ProofMeta>`).  |
| `MAX_ASSET_CODE_LEN` (12)  | Maximum Stellar asset code byte length.               |
| `MAX_MEMO_LEN` (28)        | Maximum Stellar text memo byte length.                |
| `TX_HASH_LEN` (32)         | Fixed Stellar transaction hash byte length.           |
| `ProofMetaError`           | Error variants for oversized/malformed input.         |

## Binary format

All multi-byte integers are **big-endian**.

| Field         | Size           | Notes                                      |
|---------------|----------------|--------------------------------------------|
| `amount`      | 16 bytes       | `i128` stroop amount.                      |
| `code_len`    | 1 byte         | Asset code byte length (max 12).           |
| `asset_code`  | `code_len`     | UTF-8 asset code bytes.                    |
| `memo_flag`   | 1 byte         | `0x00` = None, `0x01` = Some.              |
| `memo_len`    | 0 or 1 byte    | Present only if memo_flag == 1 (max 28).   |
| `memo`        | 0 or `memo_len`| Present only if memo_flag == 1 (UTF-8).    |
| `tx_hash`     | 32 bytes       | Transaction hash.                          |

Maximum packed size: 50 + 12 + 1 + 28 = **91 bytes**.

## Validation

- Asset codes longer than **12 bytes** are rejected on pack.
- Memo text longer than **28 bytes** (Stellar text memo limit) is rejected on
  pack.
- `tx_hash` is always fixed at 32 bytes by the type system.
- Unpack rejects truncated or malformed input with a clear `ProofMetaError`.

## Examples

```rust
use quittance_proof_meta::ProofMeta;

let meta = ProofMeta {
    amount: 100_000_000,          // 10 XLM in stroops
    asset_code: "XLM".to_string(),
    memo: Some("INV-001".to_string()),
    tx_hash: [0xab; 32],
};

let packed = meta.pack().unwrap();
let unpacked = ProofMeta::unpack(&packed).unwrap();
assert_eq!(meta, unpacked);

// Oversized asset code is rejected
let bad = ProofMeta {
    asset_code: "A".repeat(13),
    ..meta
};
assert!(bad.pack().is_err());
```

## Running the tests

```bash
cd contracts/proof_meta
cargo test
```

## Out of scope

- Wiring into the Next.js or Express MVP demos. That will be done in its
  own PR once the on-chain story needs it.
- PDF generation.
- Other crates.
- Soroban contract entry points (this is a pure helper crate, intentionally
  dependency-free so it can be reused inside and outside Soroban contracts).

## License

MIT.
