# Seller suspension flag

A standalone Soroban contract for an administrator to suspend or reinstate
seller addresses. Invoice-creation code can consult `is_suspended` or
`is_allowed` before accepting an action.

The primitive is intentionally isolated: it is not wired into Quittance's
invoice flow and is not a member of the repository's root contract workspace.

## Public API

```rust
__constructor(admin: Address)
suspend(seller: Address)
reinstate(seller: Address)
is_suspended(seller: Address) -> bool
is_allowed(seller: Address) -> bool
admin() -> Address
```

The constructor fixes the administrator for the contract instance. Both
mutating operations require that administrator's authorization. Repeating
either operation is safe and idempotent. Unknown sellers are allowed by
default.

## Example

```rust
use seller_suspension_flag::{SellerSuspensionFlag, SellerSuspensionFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let admin = Address::generate(&env);
let seller = Address::generate(&env);
let id = env.register(SellerSuspensionFlag, (admin.clone(),));
let client = SellerSuspensionFlagClient::new(&env, &id);

client.suspend(&seller);
assert!(client.is_suspended(&seller));
client.reinstate(&seller);
assert!(client.is_allowed(&seller));
```

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/seller_suspension_flag/Cargo.toml
cargo test --manifest-path contracts/seller_suspension_flag/Cargo.toml
cargo clippy --manifest-path contracts/seller_suspension_flag/Cargo.toml --all-targets -- -D warnings
```

Separate integration suites cover the happy path, boundary/idempotency cases,
authorization failures, and seller isolation.

## License

MIT.
