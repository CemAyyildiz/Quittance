# memo-template-validator

Validates a Quittance payment memo string against the `INV-<digits>`
template.

This is a self-contained learning/utility crate in the same family as
`contracts/quittance_receipt_hash` and `contracts/destination_guard`. It
ships and is tested entirely on its own — it is **not** wired into the
frontend, backend, or any other contract in this repo, and it is **not**
a member of the root `contracts/` Cargo workspace.

## What it does

A memo is valid when it is exactly the literal prefix `INV-` followed by
one or more ASCII digits (`0`-`9`) and nothing else:

- The prefix is case-sensitive (`inv-1` is rejected).
- At least one digit is required (`INV-` alone is rejected).
- Any non-digit after the prefix — whitespace, a sign, a decimal point,
  or a non-ASCII "digit" character such as a fullwidth or Arabic-Indic
  digit — is rejected.

## Public API

```rust
pub const INVOICE_MEMO_PREFIX: &str = "INV-";

pub fn is_valid_memo(memo: &str) -> bool;
```

```rust
use memo_template_validator::is_valid_memo;

assert!(is_valid_memo("INV-1"));
assert!(is_valid_memo("INV-000042"));
assert!(!is_valid_memo("INV-"));
assert!(!is_valid_memo("inv-1"));
```

## Build & test

```sh
cargo test --manifest-path contracts/memo_template_validator/Cargo.toml
cargo clippy --manifest-path contracts/memo_template_validator/Cargo.toml --all-targets -- -D warnings
```
