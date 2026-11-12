# invoice-currency-decimal-guard

Expected-decimals mismatch guard for Quittance invoice payments on Stellar Soroban.

This standalone Soroban utility contract compares a token's on-chain `decimals()` precision against the decimal places an invoice expects for its quoted amount, flagging any mismatch before a payment is accepted. It is a pure, stateless validator and is **not** wired into Quittance's Next.js frontend, Express backend, or other contracts in this repository.

## What it does

On Stellar and Soroban, classic Stellar Asset Contracts (SAC) default to **7** decimal places (stroops), whereas bridged or custom SEP-41 tokens frequently use **6** (e.g. bridged USDC/USDT), **8** (WBTC), **18** (ERC-20 style assets), or **0** (whole-unit vouchers). Accepting a token payment without verifying that the token's `decimals()` matches the precision assumed when quoting the invoice amount can result in 10x–10^11x underpayment or overpayment bugs.

`InvoiceCurrencyDecimalGuard` enforces two invariants without maintaining on-chain storage:

1. **Supported precision bounds (`0..=18`):** Both `token_decimals` and `expected_decimals` must be within `0..=MAX_TOKEN_DECIMALS` (`18`). Values above `18` are rejected (`TokenDecimalsOutOfRange` / `ExpectedDecimalsOutOfRange`).
2. **Exact precision parity:** `token_decimals` must equal `expected_decimals`; any discrepancy returns `false` from `matches_expected_decimals` and `Err(DecimalGuardError::DecimalsMismatch)` from `require_expected_decimals`.

## Public API

```rust
matches_expected_decimals(env: Env, token_decimals: u32, expected_decimals: u32) -> bool
require_expected_decimals(
    env: Env,
    token_decimals: u32,
    expected_decimals: u32,
) -> Result<(), DecimalGuardError>
validate_decimals(env: Env, decimals: u32) -> Result<(), DecimalGuardError>
max_supported_decimals(env: Env) -> u32
```

| Error variant | Code | Condition |
|---------------|------|-----------|
| `DecimalGuardError::DecimalsMismatch` | `1` | Both inputs are in `0..=18`, but `token_decimals != expected_decimals`. |
| `DecimalGuardError::TokenDecimalsOutOfRange` | `2` | `token_decimals > MAX_TOKEN_DECIMALS` (`18`) (or `validate_decimals` input `> 18`). |
| `DecimalGuardError::ExpectedDecimalsOutOfRange` | `3` | `token_decimals <= 18`, but `expected_decimals > MAX_TOKEN_DECIMALS` (`18`). |

## Usage

```rust
use invoice_currency_decimal_guard::{
    DecimalGuardError, InvoiceCurrencyDecimalGuard, InvoiceCurrencyDecimalGuardClient,
    STELLAR_DEFAULT_DECIMALS,
};
use soroban_sdk::Env;

let env = Env::default();
let contract_id = env.register(InvoiceCurrencyDecimalGuard, ());
let guard = InvoiceCurrencyDecimalGuardClient::new(&env, &contract_id);

// Native XLM / SAC asset (7 decimals) paid against a 7-decimal invoice quote:
assert!(guard.matches_expected_decimals(&STELLAR_DEFAULT_DECIMALS, &7));
guard.require_expected_decimals(&7, &7);

// 6-decimal bridged token presented for a 7-decimal invoice quote:
assert!(!guard.matches_expected_decimals(&6, &7));
assert_eq!(
    guard.try_require_expected_decimals(&6, &7),
    Err(Ok(DecimalGuardError::DecimalsMismatch))
);
```

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/invoice_currency_decimal_guard/Cargo.toml
cargo test --manifest-path contracts/invoice_currency_decimal_guard/Cargo.toml
cargo clippy --manifest-path contracts/invoice_currency_decimal_guard/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **`happy_path.rs`** — Stellar default (`7`), `6`, `18`, and valid `0..=18` precision checks.
- **`edge_boundary.rs`** — `0` decimals, `MAX_TOKEN_DECIMALS` (`18`), `19`, and `u32::MAX` boundaries.
- **`failure_cases.rs`** — `DecimalsMismatch`, `TokenDecimalsOutOfRange`, and `ExpectedDecimalsOutOfRange` error discrimination.
- **`decimal_scenarios.rs`** — End-to-end SEP-41-style mock token `decimals()` inspection across SAC (`7`), bridged USDC (`6`), and 18-decimal assets.

This crate defines its own standalone `[workspace]` in `contracts/invoice_currency_decimal_guard/Cargo.toml` and is intentionally not added to `contracts/Cargo.toml`.

## Out of scope

- Wiring into Quittance's Next.js frontend, Express backend, or other contracts under `contracts/`.
- Maintaining an on-chain asset-to-decimals registry (expected decimals are supplied by the caller).
- Testnet or mainnet deployment scripts.

## License

MIT.
