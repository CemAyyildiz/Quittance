# Multi-Sig Approval Counter (`multi_sig_approval_counter`)

Standalone Soroban contract primitive tracking M-of-N distinct-address approvals per action ID.

## Public API

- `approve(env: Env, action_id: Symbol, approver: Address, required: u32) -> Result<bool, ApprovalError>`
- `is_approved(env: Env, action_id: Symbol) -> bool`
- `approval_count(env: Env, action_id: Symbol) -> u32`
- `has_approved(env: Env, action_id: Symbol, approver: Address) -> bool`

## Build & Test

```bash
cargo test --manifest-path contracts/multi_sig_approval_counter/Cargo.toml
cargo clippy --manifest-path contracts/multi_sig_approval_counter/Cargo.toml --all-targets -- -D warnings
```
