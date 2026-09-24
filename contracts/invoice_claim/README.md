# `invoice-claim`

Deterministic, **domain-separated SHA-256** claim-hash helper for
Quittance invoices.

The crate produces a 32-byte digest over a small structured tuple of
fields that together identify a claim against a Quittance invoice. The
hash is built so that a future on-chain Soroban contract can reproduce
the exact same digest by emitting the **same byte preimage** via
`env.crypto().sha256` — both this crate (through the `sha2` crate) and
the Soroban host implement FIPS 180-4.

## Fields

| Field    | Type   | Meaning                                                     |
|----------|--------|-------------------------------------------------------------|
| `seller` | string | Stellar public key of the seller in StrKey form.            |
| `amount` | u64    | Invoice amount in stroops (`1 XLM == 10_000_000`).          |
| `memo`   | string | Quittance invoice memo (e.g. `INV-LX5R2-7HQA91WX`).         |
| `expiry` | u64    | Unix timestamp (seconds) at which the invoice expires.      |

## Domain label

Every v1 claim hash is namespaced under the fixed domain separator

```
Quittance/InvoiceClaim/v1
```

(`<product> / <feature> / <version>`, mirroring EIP-712 domain
separators). The label prevents a hash produced by a *different*
subsystem for a different purpose from colliding with a claim hash.
Callers that want their own namespace can use
`compute_with_domain(domain, …)` instead.

## Encoding layout

The preimage is a flat byte sequence, hashed with SHA-256:

```
u32_be(len(domain)) ‖ domain ‖ u32_be(VERSION)
u32_be(len("seller")) ‖ "seller" ‖ u32_be(len(seller)) ‖ seller
u64_be(amount)
u32_be(len("memo")) ‖ "memo" ‖ u32_be(len(memo)) ‖ memo
u64_be(expiry)
```

Notes:

- `VERSION` is currently `1`; it is written as `u32_be(1)` immediately
  after the domain block. It is bumped only on a backward-incompatible
  layout change.
- String fields are written under a distinct tag (`"seller"` vs
  `"memo"`) with length-prefixed values, so no two fields can alias.
- Numbers are big-endian (`u64_be`).
- Adding a new field **below** the existing ones (with a never-used
  tag) is backward-compatible: SHA-256 over a strictly longer preimage
  produces a strictly different digest, so no existing claim hash is
  invalidated.

The field order, the domain label, and the encoding are **part of the
public ABI**. Changing any of them is a breaking change and requires a
major version bump of this crate *and* a matching change in any
on-chain consumer.

## Pinned hash vector

The following frozen SHA-256 regression vector is asserted by the test
`sample_fixture_matches_pinned_hex_digest` and must not change:

| Field    | Value                                                          |
|----------|----------------------------------------------------------------|
| `seller` | `GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF`     |
| `amount` | `100_000_000`                                                  |
| `memo`   | `INV-LX5R2-7HQA91WX`                                           |
| `expiry` | `1_700_000_000`                                                |

```
SHA-256: 5b682a8e9e3b524aad6046bf0782a7230c634412b0aa6cf1671e9de625f19cc5
```

External verifiers can reproduce this digest independently by building
the preimage exactly as described in [Encoding layout](#encoding-layout)
and hashing it with any FIPS 180-4 SHA-256 implementation.

## Public API

| Function                          | Returns     | Purpose                                                                   |
|-----------------------------------|-------------|---------------------------------------------------------------------------|
| `compute(seller, amount, memo, expiry)` | `ClaimHash` | Hash under the canonical [`DOMAIN`].                                        |
| `compute_with_domain(domain, seller, amount, memo, expiry)` | `ClaimHash` | Hash under a caller-supplied domain. |
| `ClaimHash::as_bytes()`           | `&[u8; 32]` | Raw 32-byte digest.                                                        |
| `ClaimHash::to_hex()`             | `String`    | Lowercase hex digest (always 64 chars).                                    |
| `ClaimHash` (Display)             | `String`    | Same lowercase hex digest via `format!("{}", hash)`.                       |

## Build and test

From the `contracts/invoice_claim/` directory:

```sh
cargo test
```

or from the workspace root:

```sh
cargo test -p invoice-claim
```

## License

MIT — see `LICENSE` at the repository root.
