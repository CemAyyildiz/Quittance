# `fee-tier-lookup`

Standalone Soroban contract that looks up a **fee percentage (in basis points)**
for a payment amount based on configurable brackets ("tiers").

A basis point (bps) is one hundredth of a percent — `1 bps == 0.01%`, so a full
`100%` is `10_000 bps`. Fees are expressed this way to keep the math in integers
and avoid floating-point rounding.

> **Not used in the Quittance payment flow.** This crate does not read or change
> any invoice amount, and it is intentionally **not** wired into the Next.js or
> Express MVP demos. It exists only so a future fee feature has one tested,
> on-chain definition of "which bracket does this amount fall into, and what fee
> does that bracket carry".

This crate mirrors the standalone layout of the other `contracts/*` crates: its
own `Cargo.toml`, its own `Cargo.lock`, and it is **not** added to the root
`contracts/Cargo.toml` workspace `members` list.

## What it does

An admin configures an ordered list of `Tier` brackets, each mapping an
inclusive amount ceiling to a fee in basis points. `fee_bps_for(amount)` then
resolves which bracket a payment amount falls into and returns its fee.

## Rules

1. **Admin authority** — only the admin set at `init` (or through `set_admin`)
   may configure tiers. Admin-gated calls require that address's signature.
2. **Bracket validity** — every tier bound must be positive and strictly greater
   than the previous bound, so brackets never overlap.
3. **Basis-point range** — every fee must be within `0..=10_000` (0%–100%).
4. **Top bracket is open-ended** — amounts above the highest configured bound
   resolve to the highest tier's fee.

## Resolution order

`fee_bps_for` walks the tiers in ascending bound order and returns the fee of the
**first** bracket whose `upto_amount` is `>= amount`. If `amount` is greater than
every configured bound, the **highest** bracket's fee is returned. The order is
part of the public contract so consumers can rely on deterministic selection in
diagnostics and tests.

## Public API

| Item | Type | Meaning |
|------|------|---------|
| `__constructor(admin)` | `fn(Env, Address)` | Stores the admin; runs once at deploy. |
| `admin()` | `fn(Env) -> Address` | Current fee admin. |
| `set_tier(admin, upto_amount, bps)` | `fn(Env, Address, i128, u32) -> Result<(), TierError>` | Append one bracket. Admin-only. |
| `set_tiers(admin, tiers)` | `fn(Env, Address, Vec<Tier>) -> Result<(), TierError>` | Replace all brackets. Admin-only. |
| `fee_bps_for(amount)` | `fn(Env, i128) -> Result<u32, TierError>` | Resolve the fee for an amount. |
| `tiers()` | `fn(Env) -> Vec<Tier>` | Read back the configured brackets. |
| `Tier` | `struct` | `{ upto_amount: i128, bps: u32 }`. |
| `TierError` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |

### Function signatures

```rust
pub fn __constructor(env: Env, admin: Address);
pub fn admin(env: Env) -> Address;
pub fn set_tier(env: Env, admin: Address, upto_amount: i128, bps: u32) -> Result<(), TierError>;
pub fn set_tiers(env: Env, admin: Address, tiers: Vec<Tier>) -> Result<(), TierError>;
pub fn fee_bps_for(env: Env, amount: i128) -> Result<u32, TierError>;
pub fn tiers(env: Env) -> Vec<Tier>;
```

## Error codes

| Variant | Code | Meaning |
|---------|------|---------|
| `NotAuthorised` | `1` | Caller is not the fee admin. |
| `InvalidBps` | `2` | A fee is outside `0..=10_000`. |
| `InvalidBound` | `3` | A bound is non-positive, or not strictly increasing. |
| `NoTiersConfigured` | `4` | `fee_bps_for` called before any tier was configured. |

Codes are stable so off-chain consumers can match on the integer (`TierError::message()`
returns the human-readable text).

## Examples

```rust
use fee_tier_lookup::{FeeTierLookup, FeeTierLookupClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let admin = Address::generate(&env);
let id = env.register(FeeTierLookup, (&admin,));
let client = FeeTierLookupClient::new(&env, &id);

client.set_tier(&admin, &1_000, &50);   // <= 1_000 units -> 0.50%
client.set_tier(&admin, &10_000, &100); // <= 10_000 units -> 1.00%

assert_eq!(client.fee_bps_for(&500), 50);
assert_eq!(client.fee_bps_for(&5_000), 100);
assert_eq!(client.fee_bps_for(&1_000_000), 100); // top bracket, open-ended
```

## Running the tests

This crate requires the Soroban SDK. Install Rust from <https://rustup.rs>
if missing, then:

```bash
cd contracts/fee_tier_lookup
cargo test
cargo clippy --all-targets -- -D warnings
```

The tests are organised as:

- **Happy path** (`tests/happy_path.rs`) — configuration and correct lookups.
- **Edge/boundary cases** (`tests/edge_boundary.rs`) — the `<=` ceiling edges,
  single-unit brackets, `i128` extremes, the `0`/`10_000` bps bounds.
- **Failure/error cases** (`tests/failure_cases.rs`) — every `TierError`
  variant, unauthorised callers, double `init`.
- **Additional scenarios** (`tests/tier_scenarios.rs`) — the open-ended top
  bracket, reconfiguration, and instance isolation.

## Scope and non-goals

In scope:

- Resolving an amount to its bracket fee.
- Validating bracket ordering and basis-point ranges.
- Admin-gated configuration with on-chain storage.

Out of scope:

- Collecting, transferring, or accruing any fee — this contract only *looks up*
  a value.
- Cross-contract calls to other crates in this repo.
- Wiring this primitive into Quittance's invoice/payment flow.
- Deployment scripts or testnet/mainnet deployment of this crate.

## License

MIT — see `LICENSE` at the repository root.
