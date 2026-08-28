# quittance-expiry-check

Soroban helper crate that compares the **ledger timestamp** against
an **invoice expiry timestamp**. It centralises the predicate
"is this invoice still within its payment window?" so that every
Quittance contract (claim, mark-paid, cancel, etc.) enforces the
same rule.

## Overview

Every Quittance invoice carries an `expiry` timestamp. A payment
attempt is only valid if the on-chain ledger clock is strictly
before that timestamp. This crate exposes:

- A pure boolean predicate over `u64` timestamps — testable without
  the Soroban host.
- `Result`-returning rejection helpers for explicit error reporting.
- Thin `soroban_sdk::Env` wrappers that pull the ledger timestamp
  for contract authors.

## Boundary semantics

The expiry timestamp is an **inclusive** boundary:

| Comparison      | Verdict                       |
|-----------------|-------------------------------|
| `now <  expiry` | **Active** — payment allowed  |
| `now == expiry` | **Expired** — payment rejected |
| `now >  expiry` | **Expired** — payment rejected |

## Usage

### Pure helpers (no Soroban host required)

```rust
use quittance_expiry_check::{is_expired, require_active, require_future_expiry, ExpiryError};

// During a pay / claim entrypoint
match require_active(ledger_now, invoice.expiry) {
    Ok(())   => /* proceed with payment */,
    Err(ExpiryError::AlreadyExpired) => /* reject payment */,
}

// During invoice creation / update
match require_future_expiry(ledger_now, proposed_expiry) {
    Ok(())   => /* persist invoice */,
    Err(ExpiryError::ExpiryNotFuture) => /* reject creation */,
}

// Or, if all you need is a boolean
if is_expired(ledger_now, invoice.expiry) {
    /* reject */
}
```

### Env wrappers

```rust
use soroban_sdk::Env;
use quittance_expiry_check::{is_expired_env, require_active_env};

fn pay(env: &Env, expiry: u64) -> Result<(), quittance_expiry_check::ExpiryError> {
    require_active_env(env, expiry)?;
    // … settle payment …
    Ok(())
}
```

## API

### `is_expired(now, expiry) -> bool`

Returns `true` once `now >= expiry`. The core predicate every other
helper in this crate is built on.

### `require_active(now, expiry) -> Result<(), ExpiryError>`

Returns `Ok(())` if `now < expiry`, otherwise
`Err(ExpiryError::AlreadyExpired)`. The recommended helper for the
**pay** path.

### `require_future_expiry(now, expiry) -> Result<(), ExpiryError>`

Returns `Ok(())` if `expiry > now`, otherwise
`Err(ExpiryError::ExpiryNotFuture)`. The recommended helper for the
**create / update** path. Pairs with [`require_active`] so that, together,
they enforce the full lifecycle:

- At create time:  `require_future_expiry`  rejects `expiry <= now`.
- At pay time:     `require_active`        rejects `now >= expiry`.

### `is_expired_env(env, expiry) -> bool`

`Env` wrapper over [`is_expired`]: pulls `env.ledger().timestamp()`
and delegates to the pure helper.

### `require_active_env(env, expiry) -> Result<(), ExpiryError>`

`Env` wrapper over [`require_active`].

## Error variants

| Variant            | Returned by            | Meaning                                     |
|--------------------|-----------------------|---------------------------------------------|
| `AlreadyExpired`   | `require_active`      | `now >= expiry` — pay attempt is too late   |
| `ExpiryNotFuture`  | `require_future_expiry` | `expiry <= now` — proposed deadline is invalid |

## SDK pin

This crate is pinned to `soroban-sdk = 22.0.0` to stay consistent with
the other rlib helper crates in the repository. The pure `u64`
helpers and the `Result` semantics are SDK-version independent; the
`Env` wrappers require `Env` types to match exactly.

> Note: the `soroban-sdk` 22.0.0 `testutils` feature has an upstream
> compilation conflict with `ed25519-dalek` / `rand` that affects the
> `Env::default()` round-trip tests. The pure helpers are therefore
> unit-tested without the host; the `Env` wrappers are guarded by
> signature-level smoke tests. Consumers who need full round-trip
> tests should pin `soroban-sdk` ≥ 25.x where the conflict is
> resolved, or integration-test against Futurenet / Testnet RPC.

## License

MIT
