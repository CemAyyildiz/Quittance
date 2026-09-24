# `auth_one_address`

Minimal Soroban reference contract demonstrating the standard single-`Address`
authorization pattern: gate a contract method behind
[`Address::require_auth()`][require_auth] and nothing else.

This crate is a **reference demo**, not a real invoice contract. Its only
method, `noop`, performs no state changes — it exists to show how to require
the caller's authorization on-chain so derived contracts can copy the pattern
into real logic (e.g. a seller binding an invoice to their wallet).

## What it does

`AuthOneAddress` exposes one method:

| Function | Purpose |
| --- | --- |
| `noop(env, user)` | No-op method that calls `user.require_auth()` and returns. |

`user.require_auth()` panics with `AuthorizationError` if the transaction
envelope does not contain a valid signed authorization tree rooted at `user`.
The caller must include the corresponding `SorobanAuthorizedInvocation` in the
transaction and sign with the user's key (e.g. via Freighter or a wallet SDK).

## Auth expectations

| Scenario | Expected behavior |
| --- | --- |
| Call with valid auth | Succeeds — the caller signed an invocation for `user`. |
| Call without auth | Panics with `AuthorizationError` — the contract rejects the call. |

In tests the Soroban test environment emulates the two cases:

- **With auth** — `env.mock_all_auths()` auto-approves every `require_auth`
  call, letting tests focus on contract logic.
- **Without auth** — no mock auth is set, so `noop` must panic; this verifies
  the contract actually enforces authorization instead of trusting the caller.

## Test

From the `contracts/auth_one_address/` directory:

```sh
cargo test
```

The unit tests cover:

- `noop_with_valid_auth_succeeds` — with mock auth, the call succeeds.
- `noop_without_auth_panics` — without auth, the call panics with an
  `Error(Contract...)` auth error.

## License

MIT — see `LICENSE` at the repository root.

[require_auth]: https://docs.rs/soroban-sdk/latest/soroban_sdk/struct.Address.html#method.require_auth
