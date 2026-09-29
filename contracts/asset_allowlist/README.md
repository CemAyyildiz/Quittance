# asset-allowlist

Stellar asset code allowlist for the Quittance MVP.

This small crate decides whether a given asset code is permitted for
invoices in the Quittance MVP. It intentionally performs **no** issuer
validation, trustline checks, or network calls — it only answers the
question "is this asset code on the allowed list?".

## Allowed asset codes

The single source of truth is the `ALLOWED_ASSET_CODES` constant:

```rust
pub const ALLOWED_ASSET_CODES: &[&str] = &["XLM", "USDC"];
```

- `XLM` — the native Stellar asset.
- `USDC` — the Stellar USDC issuance on the relevant network.

## API

```rust
pub fn is_allowed_asset_code(asset_code: &str) -> bool
```

Returns `true` if `asset_code` is an exact, case-sensitive match against one
of the codes in `ALLOWED_ASSET_CODES`.

Matching rules:

- Case-sensitive and exact. `"xlm"`, `"Usdc"`, etc. return `false`.
- Whitespace (leading, trailing, internal) returns `false`.
- Empty string returns `false`.
- Any code not in `ALLOWED_ASSET_CODES` (e.g. `USD`, `USDT`, `BTC`) returns
  `false`, including look-alike / homoglyph variants.

## Usage

`is_allowed_asset_code` derives its behavior from the `ALLOWED_ASSET_CODES`
slice. When the MVP allowlist changes, update the constant here; consumers
automatically pick up the new set.

## Development

From the crate directory (or the `contracts` workspace root):

```bash
cargo test -p asset-allowlist
```

## License

MIT
