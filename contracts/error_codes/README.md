# `error-codes`

Shared Soroban contract errors for the Quittance ecosystem. Each variant has a
stable `u32` value. Clients, indexers, and dashboards may depend on these
numeric values, so assigned codes must never be renumbered or reused.

## Code-space

The ranges are conventions for organising related errors. They are intentionally
wide enough to leave room for future additions.

| Range | Category | Assigned codes |
| --- | --- | --- |
| `1-99` | General | `1` `InternalError`, `2` `Unauthorized`, `3` `InvalidArgument`, `4` `NotFound`, `5` `AlreadyExists` |
| `100-199` | Invoice | `100` `InvoiceNotFound`, `101` `InvoiceAlreadyPaid`, `102` `InvoiceExpired`, `103` `InvoiceCancelled` |
| `200-299` | Payment verification | `200` `PaymentAmountMismatch`, `201` `PaymentDestinationMismatch`, `202` `PaymentMemoMismatch`, `203` `PaymentAssetMismatch`, `204` `PaymentNotConfirmed` |
| `300-399` | Asset | `300` `AssetNotSupported`, `301` `AssetNotTrusted` |
| `400-499` | Amount / scale | `400` `InvalidAmount`, `401` `AmountOverflow`, `402` `ScaleMismatch` |
| `500-599` | Binding / permission | `500` `SellerMismatch`, `501` `BindingNotInitialized` |
| `600-699` | Initialisation | `600` `NotInitialized`, `601` `AlreadyInitialized` |

The complete source of truth is [`src/lib.rs`](src/lib.rs). When adding an
error, choose an unused value in the appropriate range and update this table.
When deprecating an error, leave its code reserved and document the gap rather
than assigning that value to a different variant.

## Running the tests

```bash
cd contracts
cargo test -p error-codes
```

The crate's tests cover the numeric assignments and their messages.