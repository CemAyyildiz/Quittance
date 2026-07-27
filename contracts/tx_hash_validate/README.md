# `quittance-tx-hash-validate`

Stateless helper that validates Stellar transaction hashes in their
**64-character hex** form. The check is pure, allocation-free, and
`#![no_std]`.

The crate does not touch the Quittance Next.js frontend, the Express
MVP backend, or any other Quittance crate in this PR.

## Why

Stellar transaction hashes are byte-identical 32-byte SHA-256 digests
everywhere they appear — the only difference is display. Off-chain
code, dashboards, and any future Soroban contract needs the same
shape of question answered hundreds of times: "is this a plausible
Stellar transaction hash I can pass to a Stellar explorer, a Horizon
endpoint, or a Soroban receipt helper?". The answer is a pure format
check with strict, side-effect-free rules.

Anchoring that decision on one tested crate keeps every caller honest
and avoids reimplementing the same byte loop in four or five places.

## Public API

| Item                 | Type                          | Meaning                                                                                                                                                  |
|----------------------|-------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `TX_HASH_HEX_LEN`    | `pub const usize`             | `64` — the exact hex-string length of a Stellar transaction hash. Locked as a public constant so callers can assert it.                                  |
| `is_valid_tx_hash`   | `fn(&str) -> bool`            | `true` iff the input is exactly `TX_HASH_HEX_LEN` ASCII characters and every byte is in `[0-9a-fA-F]`. See [Semantics](#semantics) below for details. |

The crate has **no other public surface**. There is no storage, no
contract entry point, no authorization model — `is_valid_tx_hash` is
a pure function on borrowed data and the constant is a compile-time
literal.

## Semantics

- **Length is strict.** Anything other than exactly `TX_HASH_HEX_LEN`
  characters is rejected before any per-byte check.
- **Hex-only.** Every byte must be a hex digit. ASCII letters outside
  `a-f/A-F`, digits outside `0-9`, punctuation, whitespace, control
  characters, and multi-byte UTF-8 sequences are all rejected.
- **Case-insensitive.** Both `deadbeef…` and `DEADBEEF…` are
  accepted. The 32-byte digest the string represents is bit-identical
  regardless of display case, so strict-lowercase is unnecessarily
  strict and would reject legitimate hashes produced by tools that
  uppercase for legibility.
- **No stripping.** A leading `0x`, surrounding whitespace, or any
  embedded non-hex character is rejected directly. The function does
  not split, trim, or otherwise normalise the input; callers that
  attach a `0x` prefix must slice it off before calling.

## Caveat: format check only

A `true` return from `is_valid_tx_hash` proves the input **looks like**
a Stellar transaction hash. It does **not** prove the hash actually
corresponds to a transaction on the Stellar ledger. Callers that need
on-ledger proof must resolve the hash against Horizon or a Soroban
host function after this format check passes.

## Scope and non-goals

In scope:

- The pure format check: `len == 64 && every byte is hex`.
- A public constant exposing `TX_HASH_HEX_LEN`.
- Strong unit-test coverage, including length boundaries, non-hex
  rejection, prefix rejection, and Unicode homoglyph rejection.

Out of scope:

- Resolving the hash against Horizon or any other Stellar endpoint.
- Hex-decoding the string into the underlying 32 raw bytes.
- Touching `frontend/`, `backend/`, or any other Quittance crate.
- Emitting events, storing state, or requiring authorization (this
  is a pure-format helper, not a deployable contract).

## Build and test

The crate has no external dependencies, so it only needs a standard
Rust toolchain (1.74+ recommended). Install from <https://rustup.rs>
if missing:

```bash
cd contracts/tx_hash_validate
cargo test
```

The workspace-level equivalent from `contracts/`:

```bash
cargo test -p quittance-tx-hash-validate
```

Tests cover valid 64-hex in lower/upper/mixed case, both zero and
`f`/`F` boundaries, off-by-one length in both directions, and a
matrix of non-hex characters including whitespace, punctuation, `0x`
prefixes (both `0x` and `0X`), and Cyrillic/East-European homoglyphs.

## Scope guard

This crate owns only the files inside `contracts/tx_hash_validate/`.
It does not import into the Next.js or Express MVP demos in this PR.
Hex-decoding, on-ledger resolution, and trustline/asset logic are
out of scope here — this crate compares characters only.

## License

MIT — see `LICENSE` at the repository root.
