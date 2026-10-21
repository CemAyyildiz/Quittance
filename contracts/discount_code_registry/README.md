# discount-code-registry

Admin-managed discount code ledger for Quittance.

An admin registers a short code together with an inclusive expiry and a
maximum number of redemptions. A later `redeem` call checks that the code is
still in force and that a use remains, then increments the counter. The same
code cannot be registered twice. Unknown, expired, and exhausted codes come
back as errors.

This crate is **not** wired into the Next.js / Express MVP demos in this PR. It
is the registry primitive that a future invoice flow can call into. It is pure
Rust: it does not depend on `soroban-sdk`, it is not compiled to Soroban
WASM, and it is not a member of the `contracts/` workspace.

## What it does

The ledger stores one row per code:

| Field        | Type   | Notes                                                                 |
|--------------|--------|-----------------------------------------------------------------------|
| `admin`      | string | Only this caller may register codes. Compared with exact equality.   |
| `code`       | string | Non-empty, at most 32 characters, charset `[A-Z0-9]`.                |
| `expires_at` | `u32`  | Inclusive deadline. A redeem at this exact value still succeeds.     |
| `max_uses`   | `u32`  | Must be at least 1. Successful redeems stop once `uses` reaches it.  |
| `uses`       | `u32`  | Starts at 0. Incremented only after a redeem passes both checks.     |

`expires_at` and `now` are caller-supplied timestamps in the same unit, for
example unix seconds or a ledger close time. The crate does not read a clock.

## Public API

```rust
pub struct DiscountRegistry { /* admin: String, codes */ }

pub fn register_code(
    &mut self,
    caller: &str,
    code: &str,
    expires_at: u32,
    max_uses: u32,
) -> Result<(), DiscountError>

pub fn redeem(&mut self, code: &str, now: u32) -> Result<bool, DiscountError>
```

`DiscountRegistry::new(admin)` stores the admin address. An empty admin is
rejected with `DiscountError::EmptyAdmin`.

`register_code` is admin-only. `redeem` does not take a caller: anyone who
holds the code may consume a use. On success `redeem` returns `Ok(true)`.
It does not return `Ok(false)`.

`get(code)` returns a `CodeSnapshot` (`expires_at`, `max_uses`, `uses`) so a
caller can read the ledger without redeeming. `validate_code(code)` checks
the shape rules without touching the ledger.

## Registration rules

Checks run in this order:

1. `caller` must equal the stored admin. Otherwise `Unauthorized`. A
   non-admin is rejected before the code is validated and before the ledger
   is searched, so the error does not reveal whether the code exists.
2. `code` must be non-empty. Otherwise `EmptyCode`.
3. `code` must be at most 32 characters. Otherwise `CodeTooLong`. Length is
   counted in Unicode scalar values. A string that is both too long and
   outside the charset still returns `CodeTooLong`.
4. Every character must be `A-Z` or `0-9`. Lowercase letters and symbols
   return `InvalidCharset`. The crate does not rewrite a code to uppercase.
5. `max_uses` must be `>= 1`. Otherwise `InvalidMaxUses`.
6. The code must not already be stored. Otherwise `AlreadyExists`, even when
   the new expiry or cap is different, and even when the existing row is
   already expired or exhausted.

## Redemption rules

Checks run in this order:

1. The code must be stored. Otherwise `NotFound`. Redeem does not re-validate
   the charset, so `""` or `"save10"` is `NotFound` rather than a shape error.
2. `now <= expires_at`. Otherwise `Expired`. This is tested before the cap,
   so a code that is both expired and exhausted returns `Expired`.
3. `uses < max_uses`. Otherwise `Exhausted`.
4. Increment `uses` by one and return `Ok(true)`.

A failed redeem does not change `uses`.

## Errors

| Variant          | When                                                        |
|------------------|-------------------------------------------------------------|
| `Unauthorized`   | `caller` is not the admin.                                  |
| `EmptyAdmin`     | `DiscountRegistry::new` received `""`.                      |
| `EmptyCode`      | Registered code was `""`.                                   |
| `CodeTooLong`    | Registered code was longer than 32 characters.              |
| `InvalidCharset` | Registered code was outside `[A-Z0-9]`.                     |
| `InvalidMaxUses` | `max_uses` was `0`.                                         |
| `AlreadyExists`  | The same code was registered a second time.                 |
| `NotFound`       | Redeem or `get` named a code that is not in the ledger.     |
| `Expired`        | `now > expires_at`.                                         |
| `Exhausted`      | `uses` has reached `max_uses`.                              |

## Usage

```rust
use discount_code_registry::{CodeSnapshot, DiscountRegistry};

let mut registry = DiscountRegistry::new("GADMIN").unwrap();
registry
    .register_code("GADMIN", "SAVE10", 1_700_000_000, 2)
    .unwrap();

assert_eq!(registry.redeem("SAVE10", 1_700_000_000).unwrap(), true);
assert_eq!(
    registry.get("SAVE10").unwrap(),
    CodeSnapshot {
        expires_at: 1_700_000_000,
        max_uses: 2,
        uses: 1,
    }
);

// The second registration of SAVE10 fails, and a stranger cannot register.
assert!(registry.register_code("GADMIN", "SAVE10", 99, 1).is_err());
assert!(registry.register_code("GOTHER", "SAVE20", 99, 1).is_err());
```

From the repository root, the same flow is the `register_and_redeem` example:

```bash
cargo run --manifest-path contracts/discount_code_registry/Cargo.toml --example register_and_redeem
```

## Tests

From this crate's directory:

```bash
cargo test
```

From the repository root:

```bash
cargo test --manifest-path contracts/discount_code_registry/Cargo.toml
cargo clippy --manifest-path contracts/discount_code_registry/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **Happy path** — admin registers a code, redeem succeeds, the counter
  moves from 0 to 1, and two codes do not share a counter.
- **Boundaries** — length 1 and length 32, length 33, charset edges
  (`A`, `Z`, `0`, `9`), lowercase and symbols, `max_uses == 0`, expiry `0`,
  and `expires_at == u32::MAX`.
- **Errors** — non-admin registration, duplicate code, unknown code, and
  expiry that does not consume a use.
- **Usage cap** — a cap of 3 accepts exactly 3 redeems, a cap of 1 rejects
  the second, caps are per code, and an expired exhausted code reports
  `Expired`.

## Out of scope (this PR)

- Wiring into the Next.js or Express MVP demos.
- A deployed Soroban contract.
- Cross-contract calls or any change to other crates under `contracts/`.
- Connecting this primitive to Quittance's invoice or payment flow.

## License

MIT.
