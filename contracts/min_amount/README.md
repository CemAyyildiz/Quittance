# `quittance-min-amount`

Soroban smart contract that rejects payments below a configurable
minimum **floor**, denominated in stroops (`i128`).

The `min_amount` crate is additive only. It does not touch the
Quittance Next.js frontend or Express MVP backend and is not wired
into them in this PR.

## Why

Quittance invoices settle in stroops. Real-world Quittance flows mix
genuine invoice payments with test sends, dust, and accidental
micro-transfers. Aggregators, payout automations, and dashboards often
want to ignore the latter. Anchoring that decision on a single,
on-chain, deploy-time-configured floor keeps the rule out of every
off-chain worker and every future contract that touches an invoice.

This crate plays that role by:

- storing the floor once, at deploy time, in instance storage, and
- exposing a tiny, easy-to-call surface that downstream contracts and
  off-chain workers can use to decide whether a payment amount passes
  that floor.

## Public API

| Function                          | Returns         | Purpose                                                                                          |
|-----------------------------------|-----------------|--------------------------------------------------------------------------------------------------|
| `__constructor(floor)`            | —               | Stores the floor (`stroops`, `i128`) in instance storage. Panics on negative input.              |
| `floor()`                         | `i128`          | Returns the floor stored at deploy time. Defaults to `0` if storage is somehow empty.           |
| `check(payment_amount)`           | `bool`          | `true` when `payment_amount >= floor`; `false` otherwise. Negative amounts always return `false`. |
| `require(payment_amount)`         | —               | Panics with `"payment below configured minimum floor"` whenever `check` would have returned `false`. Use for fail-fast gating on underpayment. |

The contract has **no authorization surface**. All four functions are
public, so any caller may invoke them.

## Semantics

- **No public setter, deploy-time-only.** The contract deliberately
  does not expose an in-place floor update. A new floor value means
  deploying a new contract instance (a new contract address), not
  calling a method on an existing one. Rotation belongs in a proxy
  layer outside this crate.
- **All amounts are in stroops** (`i128`). `1 XLM == 10_000_000`
  stroops; the contract works with the same unit balance amounts use
  everywhere else in the Quittance stack.
- **Negative amounts are rejected on every code path.** A caller
  cannot trick the `>=` comparison by passing a negative value
  because negative `payment_amount` is treated as below the floor.
- **Zero is a valid floor.** A zero-floor deployment accepts every
  non-negative amount and never panics from `require`, so a misconfig
  of the floor cannot accidentally reject every payment.

## Storage

A single instance-storage entry under the small symbol `FLOOR` holds
the chosen `i128`. Because the symbol is 5 bytes, it is covered by
Soroban's cheap small-symbol encoding.

## Errors

The contract does not currently define a `#[contracterror]` enum.
Underpayment is communicated through `panic!` messages, which is
sufficient for a single-purpose helper and matches the inline-panic
pattern used by `contracts/init_once`. Add a structured error enum
later if/when more rejection cases appear (auth, asset mismatch, etc.).

## Build and test

From the `contracts/min_amount/` directory:

```sh
cargo test
cargo build --target wasm32-unknown-unknown --release
```

The workspace-level equivalent from `contracts/`:

```sh
cargo test -p quittance-min-amount
cargo build  --target wasm32-unknown-unknown --release --package quittance-min-amount
```

Tests cover, at minimum, payment amounts **below**, **equal to**, and
**above** the floor, plus zero-floor behaviour, negative-payment
rejection, and the two `require` panic paths.

## Scope guard

This crate owns only the files inside `contracts/min_amount/`. It does
not import into the Next.js or Express MVP demos in this PR. Any
authorised-update variant, admin gating, or proxy-pattern rotation is
out of scope here — the crate compares amounts only and does not
provide an authorization framework. Admin / init-once concerns belong
in `contracts/init_once` (or a future rotation contract) and should be
composed with this one rather than duplicated.

## License

MIT — see `LICENSE` at the repository root.
