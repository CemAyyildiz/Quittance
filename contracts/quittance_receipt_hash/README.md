# quittance-receipt-hash

Domain-separated SHA-256 receipt hash for Quittance payment proofs on Stellar.

This crate computes a stable, collision-resistant 32-byte hash over the on-chain
fields of a confirmed Stellar payment. The same input bytes always produce the
same hash; using two different domain separators for the same payment produces
two different hashes. The encoding is documented in detail so that a Soroban
contract deployed later can recompute the same hash on-chain.

This crate is **not** wired into the Next.js / Express MVP demos in this PR. It
is purely the hashing primitive that future attestation work will call into.

## What it does

Given a Stellar payment confirmation it produces a single SHA-256 digest of the
canonical proof fields:

| Field            | Type                | Notes                                            |
|------------------|---------------------|--------------------------------------------------|
| `network`        | UTF-8 bytes         | Full network passphrase (testnet or public).    |
| `tx_hash`        | 32 raw bytes        | The transaction hash as recorded on-chain.      |
| `ledger`         | `u32` big endian    | Ledger sequence that closed the transaction.    |
| `seller`         | UTF-8 bytes         | Stellar public key (G...) of the invoice seller. |
| `payer`          | UTF-8 bytes         | Stellar public key (G...) of the invoice payer.  |
| `amount`         | `i64` big endian    | Amount in stroops (1 XLM = 10,000,000 stroops). |
| `asset_code`     | UTF-8 bytes         | `"XLM"` for native, issuer asset code otherwise. |
| `asset_issuer`   | Optional UTF-8      | `None` for native XLM, `Some(G...)` otherwise.   |
| `memo`           | Optional UTF-8      | `None` if the tx had no memo, otherwise its text. |
| `invoice_id`     | Optional UTF-8      | Optional Quittance invoice UUID for binding.     |

`amount` is `i64` because Stellar amounts (stroops) are signed 64-bit integers
on-chain - this matches the Soroban SDK `i64` representation.

## Domain separation

Each receipt hash is namespaced by a **domain separator** - a short label that
identifies which subsystem produced the commitment. The default separator for
this crate is:

```
Quittance/ReceiptHash/v1/STELLAR
```

A different label, even by one byte, produces a completely different hash for
the same proof fields.

## Encoding

The SHA-256 input is constructed byte-by-byte using a deterministic
length-prefixed tagged layout. The exact byte string is:

```
SHA256(
  u32_be(len(domain))         || domain_bytes                       ||
  u32_be(version == 1)        ||
  field("network",     passphrase_bytes)                          ||
  field("tx_hash",     tx_hash_32_bytes)                          ||
  field("ledger",      u32_be(ledger))                            ||
  field("seller",      seller_utf8_bytes)                         ||
  field("payer",       payer_utf8_bytes)                          ||
  field("amount",      i64_be(amount_stroops))                    ||
  field("asset_code",  asset_code_utf8_bytes)                     ||
  field("asset_issuer", option(asset_issuer_bytes))               ||
  field("memo",        option(memo_bytes))                        ||
  field("invoice_id",  option(invoice_id_bytes))
)
```

Where `field(tag, value)` is:

```
u32_be(len(tag))     || tag_bytes     ||
u32_be(len(value))   || value_bytes
```

And `option(maybe)` is:

```
None  -> 0x00
Some(value) -> 0x01 || u32_be(len(value)) || value
```

This layout blocks concatenation collisions: every field is wrapped in its own
length prefix and preceded by its own name tag, so two different sets of
fields can never produce the same preimage.

### Why length-extension is not a concern

SHA-256 is theoretically vulnerable to length-extension when used as a MAC.
This crate does not attempt to be a MAC. The preimage is fully public on the
Stellar ledger - any observer can read the fields the hash commits to. There
is no secret being protected. We use SHA-256 because the Soroban host exposes
exactly one hash function (`env.crypto().sha256`) and because SHA-256 is
already used everywhere in the existing Quittance backend as the canonical
hash for human review (tx fingerprints, explorer links, etc.).

## Soroban parity

Soroban's host function `env.crypto().sha256(&bytes)` and the `sha2` crate
used here both implement FIPS 180-4 SHA-256. Given identical input bytes
they return byte-identical 32-byte digests. A Soroban contract deployed in
a follow-up PR can reproduce the exact encoding above using
`env.crypto().sha256()` and the same u32 big-endian field writing logic.

## Usage

```rust
use quittance_receipt_hash::{
    Asset, DomainSeparator, ReceiptFields, compute, compute_hex,
};

let fields = ReceiptFields {
    network_passphrase: "Test SDF Network ; September 2015".to_string(),
    tx_hash: [0xab; 32],
    ledger: 12_345,
    seller: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABOFV".to_string(),
    payer:  "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBV".to_string(),
    amount_stroops: 100_000_000, // 10 XLM
    asset: Asset::native(),
    memo: Some("Invoice INV-001".to_string()),
    invoice_id: Some("11111111-1111-1111-1111-111111111111".to_string()),
};

let domain = DomainSeparator::quittance_v1();
let hash = compute(&domain, &fields);
assert_eq!(hash.as_hex().len(), 64);

let other = DomainSeparator::new("Quittance/SomeOtherSystem/v1");
let other_hash = compute(&other, &fields);
assert_ne!(hash, other_hash); // different domain -> different hash
```

## Verifying outside Rust

Because the algorithm is deterministic, you can independently recompute the
hash with any SHA-256 implementation:

1. Concatenate the byte stream documented above starting with the
   4-byte big-endian length of the domain label, followed by the
   4-byte big-endian version (`1`), followed by each (tag, value)
   length-prefixed pair in declaration order.
2. Feed the concatenation to SHA-256.
3. Compare the resulting 32-byte digest as hex.

### Pinned regression vector

The canonical sample (testnet, native XLM, 10 XLM, the seller and payer
strings used in `tests/stability.rs::sample_fields`) hashes under the
default `Quittance/ReceiptHash/v1/STELLAR` domain to the following digest:

```
45d16a23e4b9492ccd2d36951094398064db488e804d2e975f0222c4fdde8e31
```

This is also asserted by `tests/stability.rs::pinned_canonical_sample_hash`.
If you re-run `cargo run --example canonical_sample` in a working Rust
environment, you should see this exact hex.

## Tests

```bash
cargo test
```

The integration tests in `tests/` cover:

- **Stability** - identical inputs always produce the same hash.
- **Domain separation** - changing only the domain changes the hash.
- **Field independence** - changing exactly one field changes the hash.
- **Edge cases** - native vs non-native asset, `None` vs `Some("")` memo,
  empty vs present invoice id, all-optional-fields-missing.

## Out of scope (this PR)

- Wiring into the Next.js or Express MVP demos.
- A deployed Soroban contract (the byte-identical encoding is documented so a
  future contract can reproduce it).
- Any change to PDF UI or other crates.

## License

MIT.
