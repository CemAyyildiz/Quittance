# `invoice-template-registry`

Standalone Soroban contract implementing a **reusable invoice template registry**.

Lets a seller register a reusable invoice template (`amount` + `memo` pattern) keyed by `(seller, template_id)` so new invoices can be stamped out from it without re-specifying the same fields.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `register_template` | `fn(Env, seller: Address, template_id: Symbol, amount: i128, memo: Symbol) -> Result<(), Error>` | Register a new template for `seller` under `template_id`. |
| `template_for` | `fn(Env, seller: Address, template_id: Symbol) -> Option<Template>` | Read the stored `Template` for `(seller, template_id)`, if any. |
| `update_template` | `fn(Env, seller: Address, template_id: Symbol, amount: i128, memo: Symbol) -> Result<(), Error>` | Update an existing template owned by `seller`. |
| `remove_template` | `fn(Env, seller: Address, template_id: Symbol) -> Result<(), Error>` | Delete an existing template owned by `seller`. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_template_registry/Cargo.toml
cargo clippy --manifest-path contracts/invoice_template_registry/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
