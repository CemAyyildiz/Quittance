# receipt-counter-per-seller

Standalone Soroban contract: **independent per-seller receipt counter**.

Issues a monotonically increasing receipt number to a seller, scoped to that seller alone.
Two sellers never share a sequence — advancing one seller's counter leaves every other
seller's counter untouched, so the primitive is decoupled from any global counter.

## Rules

1. **Independence** — each seller owns a counter; issuing to one seller never changes another's.
2. **Monotonicity** — a counter only ever moves forward by exactly one.
3. **No overflow** — a counter at `u64::MAX` cannot be advanced; the call fails instead of
   wrapping around to zero.
4. **No reseeding** — a counter must start at zero; a non-zero seed is rejected because it
   would let a seller skip receipt numbers.

## Public API

| Item | Type | Meaning |
|------|------|---------|
| `next_receipt_no(seller)` | `fn(Env, Address) -> Result<u64, CounterError>` | Issue the next receipt number to `seller` and advance that seller's counter. |
| `last_receipt_no(seller)` | `fn(Env, Address) -> u64` | Read the last number issued to `seller` (`0` when none). |
| `peek_next_receipt_no(seller)` | `fn(Env, Address) -> Result<u64, CounterError>` | Read the number that would be issued next, without advancing. |

### Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `CounterError::CounterOverflow` | `1` | The counter has reached `u64::MAX` and cannot be advanced. |
| `CounterError::InvalidSeed` | `2` | A counter must start at zero. |

## Example

```rust
use receipt_counter_per_seller::{ReceiptCounterPerSeller, ReceiptCounterPerSellerClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let seller = Address::generate(&env);
let contract_id = env.register(ReceiptCounterPerSeller, ());
let client = ReceiptCounterPerSellerClient::new(&env, &contract_id);

assert_eq!(client.next_receipt_no(&seller), 1);
assert_eq!(client.next_receipt_no(&seller), 2);
assert_eq!(client.last_receipt_no(&seller), 2);
```

Receipt numbers are 1-based, so `0` always means "nothing issued yet" and can be used as
that sentinel in off-chain bookkeeping.

## Layout

```
src/lib.rs        contract entry points
src/counter.rs    pure counter arithmetic (host-testable)
src/storage.rs    instance-storage accessors
src/types.rs      storage keys, error codes, constants
tests/            happy path, edge/boundary, failure, and scenario suites
```

## Running the tests

This crate requires the [Soroban SDK](https://github.com/stellar/rs-soroban-sdk). Install
Rust from <https://rustup.rs> if missing, then:

```bash
cd contracts/receipt_counter_per_seller
cargo test
cargo clippy --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
