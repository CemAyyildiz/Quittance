# payment-channel-tag

Write-once payment origination channel tags for Quittance on Stellar.

This crate records which channel a payment came through, so a recorded payment
can later be attributed to the web app, the mobile app, or an API integration.
The channel is constrained to a small fixed enum and can be written exactly
once per payment ID.

It is a standalone Soroban contract. Nothing in `frontend/`, `backend/`, or
another contract calls it, and it is **not** wired into the Quittance
invoice/payment flow; it is the primitive only.

## What it does

Each payment `Symbol` maps to exactly one `Channel`:

| `Channel` | Meaning                                 |
|-----------|-----------------------------------------|
| `Web`     | Payment started from the hosted web app |
| `App`     | Payment started from the mobile app     |
| `Api`     | Payment started from an API integration |

`tag_channel` writes the tag for a payment that has none. The first successful
call wins; any later call returns `Error::AlreadyTagged` and leaves the stored
channel untouched. There is no update or delete method, so the origination
channel is immutable once recorded.

The contract does not check that the payment exists. It is a tag store, not the
payment ledger, and it deliberately stays decoupled from whatever records the
payment itself. It also has no owner or access-control layer: write-once is the
only integrity rule, and authorization would belong to the integrating flow.

Tags live in persistent Soroban storage keyed by `payment_id`, with their TTL
extended on every read and write. Like all Soroban storage, an inactive tag can
become archived and must be restored before it can be read; this contract does
not promise permanent availability without storage maintenance.

## Public API

```rust
tag_channel(env: Env, payment_id: Symbol, channel: Channel) -> Result<(), Error>

channel_of(env: Env, payment_id: Symbol) -> Option<Channel>
```

`tag_channel` returns `Error::AlreadyTagged` when the payment already has a
channel. `channel_of` returns `Some(channel)` for a tagged payment and `None`
for an untagged one; it never errors.

## Usage

```rust
use payment_channel_tag::{Channel, PaymentChannelTag, PaymentChannelTagClient};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let contract_id = env.register(PaymentChannelTag, ());
let client = PaymentChannelTagClient::new(&env, &contract_id);
let payment = symbol_short!("PAY1");

assert_eq!(client.channel_of(&payment), None);

client.tag_channel(&payment, &Channel::Web);
assert_eq!(client.channel_of(&payment), Some(Channel::Web));

// A second tag is rejected; the original channel is kept.
assert!(client.try_tag_channel(&payment, &Channel::Api).is_err());
assert_eq!(client.channel_of(&payment), Some(Channel::Web));
```

## Build and test

From the repository root:

```sh
cargo build --manifest-path contracts/payment_channel_tag/Cargo.toml
cargo test --manifest-path contracts/payment_channel_tag/Cargo.toml
cargo clippy --manifest-path contracts/payment_channel_tag/Cargo.toml --all-targets -- -D warnings
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

- **Happy path** (`happy_path.rs`) - an untagged payment reads as `None`, the
  first tag is stored, reads are stable, and a payment ID never seen before can
  still be tagged.
- **Boundaries** (`boundaries.rs`) - unknown payments, single-character and
  maximum-length (32 byte) `Symbol` payment IDs, and independent tags for
  separate payments.
- **Errors** (`errors.rs`) - a second tag is rejected whether it repeats or
  changes the channel, and repeated failures never mutate the stored value.
- **Channel matrix** (`channel_matrix.rs`) - all three channels round-trip, a
  payment cannot move between channels, and write-once is scoped per payment.

## Out of scope

Deployment scripts, testnet/mainnet deployment, cross-contract calls, access
control, and integration with Quittance's actual invoice/payment flow are
separate work. This issue ships the standalone primitive only.

## License

MIT.
