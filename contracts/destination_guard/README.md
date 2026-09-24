# `destination-guard`

Pure helper crate that validates the **structural shape** of Stellar
destination address strings — rejecting obviously invalid inputs before
deeper StrKey parsing begins.

This crate is intentionally tiny and dependency-free:

- No payment, storage, or trustline logic.
- Rejection follows a fixed detection order so callers get a
  deterministic error.
- All checks are purely structural: no cryptographic validation, no
  on-chain lookups.

It exists so both Soroban contracts and off-chain workers can apply the
same first-line guard to destination strings without pulling in a full
StrKey parser.

## Why

Before the Quittance codebase hands a destination string to a deeper
parser (such as `stellar-strkey` or a contract-side StrKey verifier), it
is cheaper to reject obviously bad inputs upfront. Empty strings, wrong
lengths, wrong prefixes, and non-base32 characters all fall into that
category.

## Public API

| Item                                | Type                                         | Meaning                                                                                                              |
|-------------------------------------|----------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `check_destination(input)`          | `fn(&str) -> Result<(), DestinationError>`   | Validate structural shape; `Ok(())` on success, first error on failure.                                              |
| `is_stellar_base32(c)`              | `fn(u8) -> bool`                             | `true` when the byte is in the Stellar base32 alphabet (`A-Z`, `2-7`).                                               |
| `ACCOUNT_PREFIX`                    | `const char`                                 | `'G'` — prefix for Stellar account-id StrKeys.                                                                       |
| `CONTRACT_PREFIX`                   | `const char`                                 | `'C'` — prefix for Stellar contract address StrKeys.                                                                 |
| `STRKEY_LENGTH`                     | `const usize`                                | `56` — exact character length of an ed25519 public-key StrKey.                                                        |

### Detection order

`check_destination` checks these conditions in a fixed order. The first
failure is returned:

1. **Empty** — input is `""`.
2. **Wrong length** — input is not exactly 56 characters.
3. **Invalid prefix** — first character is not `G` or `C`.
4. **Invalid character** — a byte is outside the Stellar base32 alphabet.

The order is part of the public contract so consumers can rely on it in
diagnostics and tests.

## Errors

`#[repr(u32)]` enum — stable discriminants for off-chain matching:

| Variant            | Code | Cause                                                        |
|--------------------|------|--------------------------------------------------------------|
| `Empty`            | `1`  | The destination string was empty.                            |
| `WrongLength`      | `2`  | The destination string was not exactly 56 characters long.   |
| `InvalidPrefix`    | `3`  | First character was not `G` (account) or `C` (contract).     |
| `InvalidCharacter` | `4`  | A character was outside the Stellar base32 alphabet.         |

Codes are stable so off-chain consumers can match on the integer.

## Scope and non-goals

In scope:

- Rejecting empty inputs.
- Rejecting wrong-length inputs (not exactly `STRKEY_LENGTH`).
- Rejecting invalid prefixes (must be `G` or `C`).
- Rejecting characters outside the Stellar base32 alphabet.

Out of scope:

- CRC16 checksum verification, ed25519 curve validation, or
  muxed-account decoding — use `stellar-strkey` after this guard
  clears the input.
- On-chain state validation (trustlines, sequence numbers, account
  existence) — this crate is structural only.
- Supporting `M` (muxed) or `S` (secret seed) prefixes — only
  account-id and contract addresses are destination interfaces.
- Wiring into the Next.js or Express MVP demos — that happens in a
  separate PR.

## Running the tests

This crate has no external dependencies, so it only needs a standard Rust
toolchain (1.74+ recommended). Install from <https://rustup.rs> if missing:

```bash
cd contracts/destination_guard
cargo test
```

## License

MIT — see `LICENSE` at the repository root.
