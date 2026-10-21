# note-length-guard

Standalone, stateless Soroban contract for validating optional invoice notes.
It is not connected to Quittance's frontend, backend, or payment flow.

## Rules

- Length is measured in UTF-8 bytes and must be at most the caller-provided
  `max_len` (inclusive).
- Every byte must be printable ASCII (`0x20` through `0x7E`).
- The empty note is valid, including when `max_len` is zero.

## API

`NoteLengthGuard::is_valid_note(env: Env, note: String, max_len: u32) -> bool`
returns `true` only when both the byte-length and printable-ASCII checks pass.

## Build and test

```bash
cargo test --manifest-path contracts/note_length_guard/Cargo.toml
cargo clippy --manifest-path contracts/note_length_guard/Cargo.toml --all-targets -- -D warnings
```

The crate is standalone and does not join the contracts workspace.