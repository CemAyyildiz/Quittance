# invoice-tag-registry

Attaches up to four unique short tags to an invoice id.

Tags are Soroban symbols, so they are already limited to 32 characters from
the symbol alphabet. A repeated tag is ignored. A fifth tag is ignored. Each
invoice has its own list, kept in insertion order.

This crate is standalone. It is not a member of the contracts workspace and it
is not called by the Quittance frontend or backend.

## Public API

```text
add_tag(env, invoice_id: Symbol, tag: Symbol) -> bool
tags_of(env, invoice_id: Symbol) -> Vec<Symbol>
```

`add_tag` returns true only when the tag was stored. `tags_of` returns an
empty vector when the invoice has no tags.

## Build and test

From the repository root:

```bash
cargo test --manifest-path contracts/invoice_tag_registry/Cargo.toml
cargo clippy --manifest-path contracts/invoice_tag_registry/Cargo.toml --all-targets -- -D warnings
```

A release build:

```bash
cargo build --release --manifest-path contracts/invoice_tag_registry/Cargo.toml
```
