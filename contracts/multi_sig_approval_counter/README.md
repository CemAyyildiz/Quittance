# `multi-sig-approval-counter`

Standalone Soroban contract implementing an **M-of-N distinct-address approval counter**.

Requires a configurable number of distinct addresses (`required`) to approve an `action_id` before its approval status flips to `true`. A repeated approval from the same address is idempotent and never counts twice.

This crate is self-contained in the same family as `contracts/quittance_receipt_hash`, `contracts/destination_guard`, and `contracts/auth_one_address`. It is not a member of the root workspace and is not wired into the Quittance frontend or backend.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `approve` | `fn(Env, action_id: Symbol, approver: Address, required: u32) -> bool` | Record `approver`'s distinct approval for `action_id` and return whether the action is now approved. |
| `is_approved` | `fn(Env, action_id: Symbol) -> bool` | Return `true` once `action_id` has accumulated at least `required` distinct approvals. |
| `approve_checked` | `fn(Env, action_id: Symbol, approver: Address, required: u32) -> Result<bool, ApprovalError>` | Validated approval that rejects `required == 0` or threshold mismatches across calls. |
| `approval_count` | `fn(Env, action_id: Symbol) -> u32` | Return how many distinct addresses have approved `action_id`. |
| `has_approved` | `fn(Env, action_id: Symbol, approver: Address) -> bool` | Return whether `approver` has already approved `action_id`. |
| `required_for` | `fn(Env, action_id: Symbol) -> Option<u32>` | Return the locked `required` threshold for `action_id`, if any. |

## Build & Test

```bash
cargo test --manifest-path contracts/multi_sig_approval_counter/Cargo.toml
cargo clippy --manifest-path contracts/multi_sig_approval_counter/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
