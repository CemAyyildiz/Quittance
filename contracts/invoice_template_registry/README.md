# Invoice Template Registry (`invoice_template_registry`)

Standalone Soroban contract primitive enabling sellers to register reusable invoice templates (`amount` + `memo`) keyed by `(seller, template_id)`.

## Public API

- `register_template(env: Env, seller: Address, template_id: Symbol, amount: i128, memo: Symbol) -> Result<Template, TemplateError>`
- `upsert_template(env: Env, seller: Address, template_id: Symbol, amount: i128, memo: Symbol) -> Result<Template, TemplateError>`
- `template_for(env: Env, seller: Address, template_id: Symbol) -> Option<Template>`
- `remove_template(env: Env, seller: Address, template_id: Symbol) -> Result<(), TemplateError>`

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_template_registry/Cargo.toml
cargo clippy --manifest-path contracts/invoice_template_registry/Cargo.toml --all-targets -- -D warnings
```
