# Quittance - Invoice Tag Registry Contract

Standalone Soroban contract crate implementing a free-form invoice tag registry.

## Concept

Enables attaching a small, bounded number of short string tags (Symbol) to an invoice ID for merchant organization, enforcing a maximum tag count per invoice and preventing duplicate tags.

## Public Interface

```rust
pub fn add_tag(
    env: Env,
    invoice_id: Symbol,
    tag: Symbol,
) -> Result<(), TagError>;

pub fn tags_for(
    env: Env,
    invoice_id: Symbol,
) -> Vec<Symbol>;

pub fn remove_tag(
    env: Env,
    invoice_id: Symbol,
    tag: Symbol,
) -> Result<(), TagError>;

pub fn clear_tags(
    env: Env,
    invoice_id: Symbol,
) -> Result<(), TagError>;
```

## Building and Testing

```bash
cargo build --target wasm32-unknown-unknown --release
cargo test
cargo clippy --all-targets -- -D warnings
```
