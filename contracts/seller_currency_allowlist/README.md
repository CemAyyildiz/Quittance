# seller-currency-allowlist

Per-seller currency allowlist for Quittance on Stellar.

Every seller accepts a different set of currencies for their invoices.
This crate maintains a **per-seller allowlist of accepted asset codes**: each
seller opts in to the currencies they accept, and anyone — payer, backend,
frontend — can check whether a proposed asset code is on that seller's list
before an invoice is created or paid.

The list is seller-authored: only the seller address itself may change its
own list, and only syntactically valid Stellar asset codes may enter it. The
check itself is a pure read: unknown sellers and never-allowed codes simply
return `false`.

This crate is a **standalone Soroban contract**. It is not wired into the
Next.js / Express MVP demos, it makes no cross-contract calls, and it is not
a member of the `contracts/Cargo.toml` workspace.

## What it does

Given a seller address and an asset code it records allowances and answers
membership queries:

| Call | Result | Effect |
|------|--------|--------|
| Valid code, not yet allowed | `Ok(())` | The code is added to the seller's list. |
| Code already on the list | `Ok(())` | No-op; safe for retries, no duplicate. |
| Invalid asset code | `Err(InvalidAssetCode)` | Rejected; list unchanged. |
| Caller is not the seller | auth error | Rejected; list unchanged. |
| `is_allowed_currency` with an allowed code | `true` | Code is acceptable. |
| `is_allowed_currency` with any other code/seller | `false` | Not on that seller's list. |

## Rules

1. **Per seller** — each seller's list is independent; one seller's
   allowlist can never satisfy a query about another seller.
2. **Seller-authored** — only the seller address itself may change its own
   list (`seller.require_auth()`).
3. **Valid codes only** — an asset code must be 1–12 ASCII alphanumeric
   characters, matching Stellar's asset-code rules (`XLM`, `USDC`, …).
4. **Idempotent** — allowing an already allowed code succeeds and does not
   duplicate the entry.
5. **Read-only queries** — `is_allowed_currency` performs no authorization
   and no validation; it returns `bool`, never traps.

## Public API

```rust
pub fn allow_currency(
    env: Env,
    seller: Address,
    code: Symbol,
) -> Result<(), AllowlistError>

pub fn is_allowed_currency(env: Env, seller: Address, code: Symbol) -> bool

// Free-function form of the code rules (usable off-chain).
pub fn validate_asset_code(code: &str) -> Result<(), AllowlistError>
pub const MAX_ASSET_CODE_LEN: usize = 12;

// Stable error codes with #[repr(u32)] discriminants.
#[repr(u32)]
pub enum AllowlistError {
    InvalidAssetCode = 1,
}
impl AllowlistError {
    pub fn message(&self) -> &'static str;
}

// Storage key layout (exposed for off-chain tooling).
pub enum DataKey { Allowed(Address) }
```

## Usage

```rust
use seller_currency_allowlist::{
    AllowlistError, SellerCurrencyAllowlist, SellerCurrencyAllowlistClient,
};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, Symbol};

let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(SellerCurrencyAllowlist, ());
let client = SellerCurrencyAllowlistClient::new(&env, &contract_id);

let seller = Address::generate(&env);
let xlm = symbol_short!("XLM");
let usdc = symbol_short!("USDC");
let eur = symbol_short!("EUR");

// Nothing is allowed until the seller opts in.
assert!(!client.is_allowed_currency(&seller, &xlm));

// The seller allows the currencies they accept for new invoices.
client.allow_currency(&seller, &xlm);
client.allow_currency(&seller, &usdc);
assert!(client.is_allowed_currency(&seller, &xlm));
assert!(client.is_allowed_currency(&seller, &usdc));
assert!(!client.is_allowed_currency(&seller, &eur));

// Invalid asset codes are rejected with a stable error.
assert_eq!(
    client.try_allow_currency(&seller, &Symbol::new(&env, "ABCDEFGHIJKLM")),
    Err(Ok(AllowlistError::InvalidAssetCode)),
);
```

## Tests

```bash
cargo test --manifest-path contracts/seller_currency_allowlist/Cargo.toml
cargo clippy --manifest-path contracts/seller_currency_allowlist/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **Happy path** — opting in, querying, multiple codes, idempotent
  re-allowing, per-seller isolation.
- **Edge / boundary** — 1-character and exactly-12-character codes,
  case sensitivity as distinct entries, digit-only codes, the 12-vs-13
  character boundary, empty codes.
- **Failure cases** — over-long and non-alphanumeric codes rejected with
  `InvalidAssetCode` and stable discriminants, failed validation leaving the
  list unchanged, and mutations requiring the seller's authorization.
- **Scenarios** — building a currency menu payers can check, large
  allowlists, and invalid-then-valid sequences.

## Out of scope (this PR)

- Wiring into the Next.js or Express MVP demos.
- Deployment scripts or testnet/mainnet deployment.
- Cross-contract calls to other crates in this repo.
- Issuer validation, trustline checks, or any network call.
- Any change to `frontend/`, `backend/`, or any other contract.

## License

MIT.
