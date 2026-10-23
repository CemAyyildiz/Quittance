# invoice-id-format-validator

Standalone Soroban contract: invoice id format & checksum validator.

## Purpose

Pure, allocation-free validator enforcing a fixed invoice id convention and
rejecting anything that doesn't match:

```text
INV <10-digit body> <2-digit mod-97 checksum>   (15 ASCII bytes total)
```

- The prefix is the literal uppercase `INV`.
- The body is exactly 10 ASCII digits.
- The checksum is the decimal value of a streaming mod-97 reduction over the
  body (the same technique IBAN uses), zero-padded to 2 digits. It lies in
  `0..=96`.

Validation runs over borrowed byte slices on a fixed 64-byte stack buffer in
the contract wrapper, so no heap allocation happens on-chain.

## Public API

### Contract methods

| Function                     | Returns              | Purpose                                                     |
|------------------------------|----------------------|-------------------------------------------------------------|
| `is_valid_invoice_id(id)`    | `bool`               | Full format + checksum check; any mismatch returns `false`. |
| `checksum_digit(digits)`     | `Result<u32, Error>` | Mod-97 checksum (`0..=96`) of a pure digit string.          |

### Pure primitives (also usable off-chain)

| Item                                        | Meaning                                                   |
|---------------------------------------------|-----------------------------------------------------------|
| `is_valid_invoice_id(id: &str) -> bool`     | `&str` core of the same validation.                       |
| `checksum_digit(digits: &str) -> Option<u8>`| `None` when `digits` contains a non-digit byte; empty input yields `Some(0)`. |
| `checksum_suffix(body: &str) -> Option<[u8; 2]>` | Two-digit, zero-padded checksum suffix for a body.   |
| `PREFIX` / `BODY_LEN` / `CHECKSUM_LEN` / `ID_LEN` | The convention constants (`"INV"`, 10, 2, 15).       |

## Errors

`Error` carries a stable `#[repr(u32)]` discriminant:

| Variant          | Code | Cause                                        |
|------------------|------|----------------------------------------------|
| `NonDigitChars`  | 1    | Input contained a byte outside ASCII `0`-`9` |
| `TooLong`        | 2    | Input exceeded the 64-byte accepted length   |

## Examples

```text
INV000000000101   valid   (body 0000000001 -> checksum 01)
INV000000000000   valid   (body 0000000000 -> checksum 00)
INV000000000102   invalid (checksum mismatch)
inv000000000101   invalid (lowercase prefix)
INV00000000101    invalid (14 bytes, wrong length)
INV000000000A01   invalid (non-digit body byte)
```

## Build and test

```sh
cargo test --manifest-path contracts/invoice_id_format_validator/Cargo.toml
cargo clippy --manifest-path contracts/invoice_id_format_validator/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.

## License

MIT
