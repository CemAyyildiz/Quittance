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

## CLI invoke examples

`proof_meta` is a pure helper crate: it compiles into a library, not into a
deployed contract with its own entry points. The `soroban contract invoke`
examples below therefore target a **deployed wrapper contract** that exposes
`pack_meta` / `unpack_meta` over this crate — replace each placeholder
(`C...` contract id, `G...` account) with your own values before running.
If your CLI is installed under the newer `stellar` name, the flags are
identical: `stellar contract invoke ...`.

### Prerequisites

```bash
# Placeholders — replace before running:
export CONTRACT_ID=C...      # deployed wrapper contract id
export SOURCE_ACCOUNT=G...   # account that signs the invoke
```

### Pack proof metadata

Serializes the proof fields into the packed binary layout documented above
(max 91 bytes).

```bash
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  pack_meta \
  --amount 100000000 \
  --asset_code XLM \
  --memo INV-001 \
  --tx_hash abababababababababababababababababababababababababababababababab
```

**Return shape:** the packed bytes as a hex string (≤ 91 bytes, 182 hex
characters at most). For the input above the result is:

```
00000000000000000000000005f5e10003584c4d0107494e562d303031abababababababababababababababababababababababababababababababab
```

Persist it wherever the payment proof needs the on-chain commitment.

### Unpack proof metadata

Round-trips packed bytes back into their fields:

```bash
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  unpack_meta \
  --packed 00000000000000000000000005f5e10003584c4d0107494e562d303031abababababababababababababababababababababababababababababababab
```

**Return shape:** a struct with `amount: i128` (stroops),
`asset_code: String`, `memo: Option<String>` (absent when no memo was
packed) and `tx_hash: Bytes` (32 bytes). The CLI prints it roughly as:

```json
{"amount": 100000000, "asset_code": "XLM", "memo": "INV-001", "tx_hash": "abab..."}
```

### Notes

- Amounts are always in **stroops** (1 XLM = 10,000,000 stroops); the
  example packs 10 XLM.
- `--tx_hash` takes the 64-character hex transaction hash and is stored as
  the fixed 32 raw bytes (`TX_HASH_LEN`).
- Validation failures (`AssetCodeTooLong`, `MemoTooLong`, `Truncated`, ...)
  surface as the invoke's error output — see the API table above.

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
