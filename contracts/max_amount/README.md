# `quittance-max-amount`

Soroban smart contract that rejects payments above a configurable
maximum **ceiling**, denominated in stroops (`i128`).

The `max_amount` crate is additive only. It does not touch the
Quittance Next.js frontend or Express MVP backend and is not wired
into them in this PR.

## Why

Quittance invoices settle in stroops. Some deployments need an upper
bound on a single payment — for example, per-invoice fraud caps,
regulatory reporting thresholds, or a merchant's policy that
unusually large wires should be split into multiple invoices rather
than one. Anchoring that decision on a single, on-chain,
deploy-time-configured ceiling keeps the rule out of every off-chain
worker and every future contract that touches an invoice.

This crate plays that role by:

- storing the ceiling once, at deploy time, in instance storage, and
- exposing a tiny, easy-to-call surface that downstream contracts
  and off-chain workers can use to decide whether a payment amount
  fits under that ceiling.

## Pair with `quittance-min-amount`

`max-amount` is the upper-bound companion to `quittance-min-amount`,
which enforces a floor. Downstream contracts compose `check(...)` on
both crates to gate a payment inside a `[floor, ceiling]` band. The
crates are deliberately separate so each policy decision is
independently auditable, versioned, and re-deployable to a new
contract address.

## Public API

| Function                            | Returns  | Purpose                                                                                          |
|-------------------------------------|----------|--------------------------------------------------------------------------------------------------|
| `__constructor(ceiling)`            | —        | Stores the ceiling (`stroops`, `i128`) in instance storage. Panics on negative input.            |
| `ceiling()`                         | `i128`   | Returns the ceiling stored at deploy time. Defaults to `0` if storage is somehow empty.         |
| `check(payment_amount)`             | `bool`   | `true` when `payment_amount <= ceiling` and `payment_amount >= 0`; `false` otherwise.            |
| `require(payment_amount)`           | —        | Panics with `"payment above configured maximum ceiling"` whenever `check` would have returned `false`. Use for fail-fast gating on overpayment. |

The contract has **no authorization surface**. All four functions are
public, so any caller may invoke them.

## Semantics

- **No public setter, deploy-time-only.** The contract deliberately
  does not expose an in-place ceiling update. A new ceiling value
  means deploying a new contract instance (a new contract address);
  there is no method to mutate the ceiling on a live contract.
  Rotation belongs in a proxy layer outside this crate.
- **All amounts are in stroops** (`i128`). `1 XLM == 10_000_000`
  stroops; the contract works with the same unit balance amounts use
  everywhere else in the Quittance stack.
- **Negative amounts are rejected on every code path.** A negative
  `payment_amount` always returns `false` from `check` and panics
  from `require`. This mirrors behaviour in the companion
  `quittance-min-amount` crate so callers do not need a separate
  sign guard for the band as a whole.
- **Zero is a valid ceiling — and a kill switch.** A zero-ceiling
  deployment rejects every positive payment and never accepts more
  than zero stroops. This is useful as a one-line policy kill
  switch without re-deploying business logic.

## Storage

A single instance-storage entry under the small symbol `CEILING`
holds the chosen `i128`. Because the symbol is 7 bytes, it is covered
by Soroban's cheap small-symbol encoding.

## Errors

The contract does not currently define a `#[contracterror]` enum.
Overpayment is communicated through `panic!` messages, which is
sufficient for a single-purpose helper and matches the inline-panic
pattern used by `contracts/init_once` and `contracts/min_amount`.
Add a structured error enum later if/when more rejection cases
appear (auth, asset mismatch, etc.).

## Build and test

From the `contracts/max_amount/` directory:

```sh
cargo test
cargo build --target wasm32-unknown-unknown --release
```

The workspace-level equivalent from `contracts/`:

```sh
cargo test -p quittance-max-amount
cargo build  --target wasm32-unknown-unknown --release --package quittance-max-amount
```

Tests cover, at minimum, payment amounts **below**, **equal to**, and
**above** the ceiling, plus a zero-ceiling kill switch, negative-
payment rejection, the two `require` panic paths, an irrational-
ceiling off-by-one boundary regression, and an `i128::MAX`-ceiling
overflow-safety edge.

## Scope guard

This crate owns only the files inside `contracts/max_amount/`. It does
not import into the Next.js or Express MVP demos in this PR. Any
authorised-update variant, admin gating, or proxy-pattern rotation is
out of scope here — the crate compares amounts only and does not
provide an authorization framework. Admin / init-once concerns belong
in `contracts/init_once` (or a future rotation contract) and should be
composed with this one rather than duplicated.

## License

MIT — see `LICENSE` at the repository root.
