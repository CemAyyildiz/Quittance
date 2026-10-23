# seller-kyc-flag

Admin-settable seller KYC flag for Quittance on Stellar.

This crate stores one boolean per seller address: `true` once the administrator
has verified the seller's KYC, `false` otherwise. Only the administrator may set
or clear the flag; everyone else can only read it.

It is a standalone Soroban contract. Nothing in `frontend/`, `backend/`, or
another contract calls it, and it is **not** wired into the Quittance
invoice/payment flow; it is the primitive only.

## What it does

Each seller `Address` maps to a KYC boolean:

| Stored value | `is_verified` returns | Meaning                                  |
|--------------|-----------------------|------------------------------------------|
| `true`       | `true`                | Administrator has verified the seller    |
| `false`      | `false`               | Not verified, or explicitly cleared      |
| unset        | `false`               | Seller has never been verified           |

The administrator is fixed when the contract is deployed through
`__constructor`; there is no transfer or rotation method. `set_verified` loads
that administrator and calls `require_auth()` before writing, so a call that the
administrator did not authorize aborts the invocation and changes nothing.
Setting a flag to the value it already has is an idempotent success, which makes
retries safe.

There is no contract error enum for this crate: the only failure mode is a
missing administrator authorization, which Soroban reports as a failed
invocation rather than a returned `Error` value.

Flags live in persistent Soroban storage keyed by seller address, with their
TTL extended on every read and write. Like all Soroban storage, an inactive flag
can become archived and must be restored before it can be read; this contract
does not promise permanent availability without storage maintenance.

## Public API

```rust
__constructor(env: Env, admin: Address)

set_verified(env: Env, seller: Address, verified: bool)

is_verified(env: Env, seller: Address) -> bool
```

`set_verified` requires authorization from the configured administrator and
stores the value for `seller`. `is_verified` is a read-only check that returns
`false` for sellers with no stored flag.

## Usage

```rust
use seller_kyc_flag::{SellerKycFlag, SellerKycFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let admin = Address::generate(&env);
let contract_id = env.register(SellerKycFlag, (admin,));
let client = SellerKycFlagClient::new(&env, &contract_id);
let seller = Address::generate(&env);

assert!(!client.is_verified(&seller));

// Only the administrator's authorization is accepted here.
client.set_verified(&seller, &true);
assert!(client.is_verified(&seller));

// The administrator can clear the flag later.
client.set_verified(&seller, &false);
assert!(!client.is_verified(&seller));
```

## Build and test

From the repository root:

```sh
cargo build --manifest-path contracts/seller_kyc_flag/Cargo.toml
cargo test --manifest-path contracts/seller_kyc_flag/Cargo.toml
cargo clippy --manifest-path contracts/seller_kyc_flag/Cargo.toml --all-targets -- -D warnings
```

Or from this directory:

```sh
cargo test
cargo clippy --all-targets -- -D warnings
```

The crate has its own Cargo workspace (`[workspace]` in `Cargo.toml`) and is not
listed in `contracts/Cargo.toml`'s workspace members, matching most standalone
crates under `contracts/`.

## Tests

The test modules in `src/tests/` cover:

- **Happy path** (`happy_path.rs`) - the admin verifies and clears a seller, and
  setting the current value is an idempotent success.
- **Boundaries** (`boundaries.rs`) - unknown sellers, per-seller independence,
  clearing an already-unverified seller, and several sellers keeping their own
  values.
- **Errors** (`errors.rs`) - a set without administrator authorization is
  rejected and leaves the seller unverified, a rejected clear keeps the existing
  verification, and repeated rejected calls change nothing.
- **Admin control** (`admin_control.rs`) - the recorded authorization belongs to
  the configured admin, the admin can toggle the flag repeatedly, and clearing
  one seller leaves other sellers verified.

## Out of scope

Deployment scripts, testnet/mainnet deployment, cross-contract calls, admin
rotation, and integration with Quittance's actual invoice/payment flow are
separate work. This issue ships the standalone primitive only.

## License

MIT.
