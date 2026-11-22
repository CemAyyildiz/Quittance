# multi-currency-invoice-tag

Invoice settlement-currency tag for Quittance on Stellar.

An invoice is denominated in exactly one currency, so before a payer
transfers funds the contract must be able to answer: **may this invoice be
settled in this asset?** This crate tags an invoice with the single asset
code it may be settled in — at creation time — and exposes a check that
validates a proposed payment asset against that tag before the transfer
happens.

The tag is single-valued and permanent: a conflicting re-tag is rejected and
the original tag survives, so an invoice's settlement currency can never be
swapped after issuance.

This crate is a **standalone Soroban contract**. It is not wired into the
Next.js / Express MVP demos, it makes no cross-contract calls, and it is not
a member of the `contracts/Cargo.toml` workspace.

## What it does

Given an invoice identifier (a Soroban `Symbol`) it records the asset code
the invoice may be settled in and answers whether a proposed asset matches:

| Call | Result | Effect |
|------|--------|--------|
| First `tag_invoice` for an invoice | `true` | The tag is written. |
| `tag_invoice` with the *same* code again | `true` | No-op; safe for retries. |
| `tag_invoice` with a *different* code | `false` | Rejected; original tag preserved. |
| `matches_tag` where the code equals the tag | `true` | Proposed asset is acceptable. |
| `matches_tag` where the code differs | `false` | Proposed asset is rejected. |
| `matches_tag` on an untagged invoice | `false` | Nothing settles "by default". |

## Rules

1. **One code per invoice** — an invoice settles in exactly one asset.
2. **The tag is permanent** — a conflicting re-tag returns `false` and
   leaves the original tag untouched.
3. **Retries are safe** — re-tagging with the same code returns `true` and
   changes nothing.
4. **Untagged invoices match nothing** — `matches_tag` returns `false`
   until the invoice has been tagged.
5. **Matching is exact** — symbols are compared by value, so `XLM` and
   `xlm` are different asset codes.

## Public API

```rust
pub fn tag_invoice(env: Env, invoice_id: Symbol, asset_code: Symbol) -> bool
pub fn matches_tag(env: Env, invoice_id: Symbol, asset_code: Symbol) -> bool

// Storage key layout (exposed for off-chain tooling).
pub enum DataKey { Tag(Symbol) }
```

## Usage

```rust
use multi_currency_invoice_tag::{
    MultiCurrencyInvoiceTag, MultiCurrencyInvoiceTagClient,
};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let contract_id = env.register(MultiCurrencyInvoiceTag, ());
let client = MultiCurrencyInvoiceTagClient::new(&env, &contract_id);

let invoice = symbol_short!("INV1");
let xlm = symbol_short!("XLM");
let usdc = symbol_short!("USDC");

// Tag at creation time.
assert!(client.tag_invoice(&invoice, &xlm));

// Validate a proposed payment asset before the transfer.
assert!(client.matches_tag(&invoice, &xlm));   // XLM settles it
assert!(!client.matches_tag(&invoice, &usdc)); // USDC is rejected

// The tag cannot be changed after the fact.
assert!(!client.tag_invoice(&invoice, &usdc));
assert!(client.matches_tag(&invoice, &xlm));   // original tag intact
```

## Tests

```bash
cargo test --manifest-path contracts/multi_currency_invoice_tag/Cargo.toml
cargo clippy --manifest-path contracts/multi_currency_invoice_tag/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **Happy path** — tagging an invoice, confirming the matching asset,
  idempotent re-tagging, independent tags per invoice.
- **Edge / boundary** — single-character codes, case sensitivity, one-character
  symbol differences, 12-character asset codes, `symbol_short!` vs
  `Symbol::new` equality, the same code reused across invoices.
- **Failure cases** — conflicting re-tags rejected with the original tag
  preserved, untagged invoices matching nothing, failed re-tags never
  creating a second tag.
- **Scenarios** — pre-transfer asset validation, per-invoice validation
  across a batch, and repeated conflicts that never move the tag.

## Out of scope (this PR)

- Wiring into the Next.js or Express MVP demos.
- Deployment scripts or testnet/mainnet deployment.
- Cross-contract calls to other crates in this repo.
- Any change to `frontend/`, `backend/`, or any other contract.

## License

MIT.
