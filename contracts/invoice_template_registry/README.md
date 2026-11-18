# Quittance - Invoice Template Registry Contract

A standalone Soroban contract crate enabling sellers to register reusable invoice templates (fixed amount + memo pattern) keyed by a template ID, allowing new invoices to be stamped out without re-specifying repetitive parameters.

## Concept

Sellers register persistent invoice templates indexed by their address and a unique `template_id` (Symbol). Each template stores the fixed amount and default memo pattern. Sellers can inspect, update, or remove their own templates.

## Public Interface

```rust
pub fn register_template(
    env: Env,
    seller: Address,
    template_id: Symbol,
    amount: i128,
    memo: Symbol,
) -> Result<(), TemplateError>;

pub fn template_for(
    env: Env,
    seller: Address,
    template_id: Symbol,
) -> Option<Template>;

pub fn remove_template(
    env: Env,
    seller: Address,
    template_id: Symbol,
) -> Result<(), TemplateError>;

pub fn has_template(
    env: Env,
    seller: Address,
    template_id: Symbol,
) -> bool;
```

## Building and Testing

```bash
cargo build --target wasm32-unknown-unknown --release
cargo test
cargo clippy --all-targets -- -D warnings
```
