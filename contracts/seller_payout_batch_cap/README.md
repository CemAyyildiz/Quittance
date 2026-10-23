# Seller payout batch cap

A standalone Soroban contract that stores an administrator-controlled maximum
number of payout entries allowed in one batch. A batch at or below the cap is
accepted; a larger batch is rejected as a whole.

This utility is not wired into Quittance's payout flow and is intentionally not
a member of the root contract workspace.

## Public API

```rust
__constructor(admin: Address, initial_max: u32)
set_max_batch_size(max: u32)
max_batch_size() -> u32
is_batch_allowed(size: u32) -> bool
validate_batch(size: u32) -> Result<(), Error>
```

Only the configured administrator can change the cap. A cap of zero is valid
and permits only an empty batch. `validate_batch` returns `BatchTooLarge`
without processing or recording any entries; consumers should perform payout
processing only after it succeeds.

## Example

```rust
use seller_payout_batch_cap::{SellerPayoutBatchCap, SellerPayoutBatchCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let admin = Address::generate(&env);
let id = env.register(SellerPayoutBatchCap, (admin, 10_u32));
let client = SellerPayoutBatchCapClient::new(&env, &id);

assert!(client.is_batch_allowed(&10));
assert!(!client.is_batch_allowed(&11));
```

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/seller_payout_batch_cap/Cargo.toml
cargo test --manifest-path contracts/seller_payout_batch_cap/Cargo.toml
cargo clippy --manifest-path contracts/seller_payout_batch_cap/Cargo.toml --all-targets -- -D warnings
```

The test suites separately cover normal use, numeric boundaries, authorization
and oversized-batch failures, and live cap reconfiguration.

## License

MIT.
