# `usdc-testnet-issuer`

A minimal Rust crate that exposes the Stellar **testnet USDC issuer**
constant used across the Quittance product as a read-only accessor.

The crate is `no_std`-friendly and has zero runtime dependencies, so it can
be vendored as a path dependency into a future Soroban contract without
pulling in extra crates. It does not itself import the `soroban-sdk` —
consumers that need a `soroban_sdk::String` can wrap the result with
`String::from_str(&env, USDC_TESTNET_ISSUER)` at the call site.

## Scope

Owns only the documented testnet USDC issuer value. It does **not**:

- Create or manage trustlines.
- Contact Horizon or any other network endpoint.
- Read environment variables or runtime configuration.
- Carry mainnet issuers (out of scope for issue #48).
- Touch the Next.js MVP or the Express MVP (per the issue conflict rule).

The string returned by the accessor is identical to the issuer recorded in
Quittance's front-end asset list (`frontend/lib/assets.ts`), so demos,
scripts, and any future Soroban contracts can share a single source of
truth for the testnet USDC issuer.

## Public surface

```rust
pub const USDC_TESTNET_ISSUER: &str =
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

pub fn usdc_testnet_issuer() -> &'static str;
```

The function returns the same value as the constant. It exists so callers
that prefer a uniform "no raw constants, functions only" boundary still
have a stable public entry point.

## Usage

Add the crate as a path or workspace dependency, then call the accessor:

```rust
use usdc_testnet_issuer::usdc_testnet_issuer;

let issuer = usdc_testnet_issuer();
assert_eq!(
    issuer,
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
);
```

The constant is also available for compile-time use:

```rust
use usdc_testnet_issuer::USDC_TESTNET_ISSUER;
```

## Testing

```bash
cargo test -p usdc-testnet-issuer
```

Three unit tests assert that both the constant and the accessor return the
documented testnet USDC issuer, and that the constant is exactly 56
characters long (the StrKey length of a Stellar ED25519 public key).

## Out of scope (per issue #48)

- Mainnet issuer.
- Auto trustline creation.
- Other crates.

## License

MIT — see the repository root `LICENSE` file.
