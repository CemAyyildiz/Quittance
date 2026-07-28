# contracts/payer-bind

A small, self-contained, dependency-light Rust helper crate for
**optional payer binding** in the Quittance Soroban ecosystem.

## What it does

Validates an `Option<Address>` (payer address) against a "bound" payer
address with exactly three outcomes:

| Provided      | Result          |
|---------------|-----------------|
| `None`        | `Ok(())`        |
| `Some(payer)` matching bound | `Ok(())` |
| `Some(payer)` NOT matching bound | `Err(PayerMismatch)` |

This lets invoice flows cleanly distinguish between **open** invoices
(anyone can pay — pass `None`) and **bound** invoices (only the
designated payer may settle — pass `Some(&caller)`).

## API

| Function                                          | Purpose                                          |
|---------------------------------------------------|--------------------------------------------------|
| `check_payer(provided: Option<&Address>, bound: &Address) -> Result<(), PayerError>` | Central validation — see table above. |
| `PayerError::PayerMismatch`                       | Only error variant; signals a payer mismatch.    |

## Non-goals

- No storage, no contract instance, no Soroban `#[contract]`.
- This crate does **not** persist or load the bound address — the caller
  must supply it.
- No wiring to the Next.js or Express MVP demos in this PR.

## Build and test

```sh
cd contracts/payer_bind
cargo test
```

## Scope

This crate owns **only** the files inside `contracts/payer_bind/`. It
does not modify any file outside that directory.

## License

MIT — see `LICENSE` at the repository root.
