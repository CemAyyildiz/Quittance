//! `quittance-expiry-check`
//!
//! Soroban helper crate that compares the **ledger timestamp** against
//! an **invoice expiry timestamp** and exposes both a boolean check
//! and a `Result`-returning rejection helper. Every Quittance contract
//! that owns an invoice with a deadline (claim, mark-paid, cancel,
//! etc.) must answer the same question — "is the invoice still
//! within its payment window?" — and this crate centralises the
//! comparison so that every layer enforces identical semantics.
//!
//! # Scope (intentionally bounded)
//!
//! - Two pure helpers over `u64` timestamps:
//!   [`is_expired`] and [`require_active`].
//! - One pure setup-time guard: [`require_future_expiry`].
//! - Two thin [`soroban_sdk::Env`] wrappers that pull the ledger
//!   timestamp for callers: [`is_expired_env`] and [`require_active_env`].
//! - One typed error: [`ExpiryError`].
//! - No business logic. No storage. No event emission. No network calls.
//!
//! # Boundary semantics
//!
//! The expiry timestamp is an **inclusive** boundary. Concretely:
//!
//! - `now <  expiry` → the invoice is **active** (payment is allowed).
//! - `now >= expiry` → the invoice is **expired** (payment is rejected).
//!
//! This matches how on-chain deadlines typically behave: the instant
//! the ledger clock reaches the deadline, the invoice stops being
//! valid. Callers that need different boundary semantics must layer
//! that on top of this crate rather than fork it.
//!
//! # When you would use this
//!
//! - Inside a Soroban invoice contract's `pay` / `claim` entrypoint,
//!   to reject payments whose ledger time has reached the deadline.
//! - Inside a Soroban invoice contract's `create` / `init` entrypoint,
//!   to reject expiry values that are not strictly in the future.
//! - In off-chain workers (indexers, monitoring tools) that need the
//!   same comparison rules as the on-chain contract — the pure `u64`
//!   helpers do not need an [`Env`].
//!
//! # When you would NOT use this
//!
//! - For checking TTL or ledger-entry lifetime; that is the domain of
//!   `quittance-storage-ttl`.
//! - For validating invoice status transitions (Pending → Paid /
//!   Expired / Cancelled); that is the domain of
//!   `quittance-status-transitions`.

#![no_std]
#![deny(unsafe_code)]
#![deny(unused_must_use)]

use soroban_sdk::Env;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/// Errors returned by [`require_active`] and [`require_future_expiry`].
///
/// The variants are deliberately small: callers that need richer
/// semantics (multi-cause rejection, branded errors tied to a
/// specific on-chain domain) should layer their own error enum on top
/// of this one and translate at the contract boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpiryError {
    /// The provided `now` is greater than or equal to `expiry`.
    ///
    /// Returned by [`require_active`] when the ledger clock has
    /// reached the deadline and the operation must be rejected.
    AlreadyExpired,
    /// The proposed `expiry` is less than or equal to `now`.
    ///
    /// Returned by [`require_future_expiry`] when a caller attempts
    /// to create or update an invoice with a deadline that is not
    /// strictly in the future. Includes the equality case — even an
    /// expiry of exactly `now` is rejected at setup time.
    ExpiryNotFuture,
}

// ---------------------------------------------------------------------------
// Pure helpers (testable without the Soroban host)
// ---------------------------------------------------------------------------

/// Returns `true` if `now >= expiry`.
///
/// This is the core predicate of the crate. [`require_active`]
/// delegates directly to it; [`require_future_expiry`] uses the
/// algebraically equivalent `expiry <= now` form so that the
/// rejection variant mirrors the natural setup-time check.
///
/// # Boundary
///
/// The expiry timestamp is an **inclusive** boundary: `now == expiry`
/// is already considered expired.
///
/// # Examples
///
/// ```
/// use quittance_expiry_check::is_expired;
///
/// // Before the deadline
/// assert!(!is_expired(1_700_000_000, 1_700_000_500));
///
/// // Way before the deadline
/// assert!(!is_expired(0, u64::MAX));
///
/// // Exactly at the deadline (inclusive boundary)
/// assert!(is_expired(1_700_000_000, 1_700_000_000));
///
/// // After the deadline
/// assert!(is_expired(1_700_000_500, 1_700_000_000));
/// ```
#[must_use = "a `true` return means the deadline has been reached; the caller must handle this case"]
pub fn is_expired(now: u64, expiry: u64) -> bool {
    now >= expiry
}

/// Returns `Ok(())` if `now < expiry`, otherwise
/// `Err(ExpiryError::AlreadyExpired)`.
///
/// This is the standard rejection-style helper for invoice-payment
/// entrypoints. Callers that want a panic-on-rejection shortcut can
/// `.unwrap()` or `.expect()` the result.
///
/// # Boundary
///
/// `now == expiry` is rejected (inclusive boundary).
///
/// # Examples
///
/// ```
/// use quittance_expiry_check::{require_active, ExpiryError};
///
/// // Happy path: still within the window.
/// assert!(require_active(1_700_000_000, 1_700_000_500).is_ok());
///
/// // Rejection case 1: exactly at the deadline.
/// assert_eq!(
///     require_active(1_700_000_000, 1_700_000_000),
///     Err(ExpiryError::AlreadyExpired),
/// );
///
/// // Rejection case 2: past the deadline.
/// assert_eq!(
///     require_active(1_700_000_500, 1_700_000_000),
///     Err(ExpiryError::AlreadyExpired),
/// );
/// ```
#[must_use = "a `Err` return means payment is rejected; the caller must handle this case"]
pub fn require_active(now: u64, expiry: u64) -> Result<(), ExpiryError> {
    if is_expired(now, expiry) {
        Err(ExpiryError::AlreadyExpired)
    } else {
        Ok(())
    }
}

/// Returns `Ok(())` if `expiry > now`, otherwise
/// `Err(ExpiryError::ExpiryNotFuture)`.
///
/// Use this at invoice **creation / update** time to guarantee that
/// the deadline is strictly in the future. Pairs with
/// [`require_active`] so that, together, they enforce the full
/// create-then-pay lifecycle:
///
/// - At create time:  [`require_future_expiry`] rejects `expiry <= now`.
/// - At pay time:     [`require_active`]       rejects `now >= expiry`.
///
/// # Boundary
///
/// `expiry == now` is rejected; only `expiry > now` is accepted.
///
/// # Examples
///
/// ```
/// use quittance_expiry_check::{require_future_expiry, ExpiryError};
///
/// // Happy path: expiry strictly in the future.
/// assert!(require_future_expiry(1_700_000_000, 1_700_000_500).is_ok());
///
/// // Rejection case 1: expiry equal to now (not strictly future).
/// assert_eq!(
///     require_future_expiry(1_700_000_000, 1_700_000_000),
///     Err(ExpiryError::ExpiryNotFuture),
/// );
///
/// // Rejection case 2: expiry in the past.
/// assert_eq!(
///     require_future_expiry(1_700_000_500, 1_700_000_000),
///     Err(ExpiryError::ExpiryNotFuture),
/// );
/// ```
#[must_use = "a `Err` return means the deadline is invalid; the caller must handle this case"]
pub fn require_future_expiry(now: u64, expiry: u64) -> Result<(), ExpiryError> {
    // Algebraically identical to `expiry <= now`, but expressed in
    // terms of `is_expired` so that any future change to the
    // boundary semantics propagates everywhere automatically.
    if is_expired(now, expiry) {
        Err(ExpiryError::ExpiryNotFuture)
    } else {
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Env wrappers
// ---------------------------------------------------------------------------

/// [`Env`]-bound wrapper around [`is_expired`]: pulls the ledger
/// timestamp from `env.ledger().timestamp()` and compares it to
/// `expiry`.
///
/// # Boundary
///
/// `ledger_ts == expiry` is considered **expired** (see [`is_expired`]).
///
/// # Example
///
/// ```ignore
/// use soroban_sdk::Env;
/// use quittance_expiry_check::is_expired_env;
///
/// fn pay(env: &Env, expiry: u64) {
///     if is_expired_env(env, expiry) {
///         panic!("invoice expired");
///     }
///     // … proceed with payment …
/// }
/// ```
pub fn is_expired_env(env: &Env, expiry: u64) -> bool {
    is_expired(env.ledger().timestamp(), expiry)
}

/// [`Env`]-bound wrapper around [`require_active`]: pulls the ledger
/// timestamp from `env.ledger().timestamp()` and returns
/// `Err(ExpiryError::AlreadyExpired)` once the deadline has been
/// reached.
///
/// # Example
///
/// ```ignore
/// use soroban_sdk::Env;
/// use quittance_expiry_check::require_active_env;
///
/// fn pay(env: &Env, expiry: u64) -> Result<(), quittance_expiry_check::ExpiryError> {
///     require_active_env(env, expiry)?;
///     // … proceed with payment …
///     Ok(())
/// }
/// ```
pub fn require_active_env(env: &Env, expiry: u64) -> Result<(), ExpiryError> {
    require_active(env.ledger().timestamp(), expiry)
}

// ---------------------------------------------------------------------------
// Documented mock for consuming contracts
// ---------------------------------------------------------------------------

/// # Testing contracts that use `quittance-expiry-check`
///
/// The [`Env`] wrappers read `env.ledger().timestamp()`, which
/// requires a full Soroban host (an `Env::default()` constructed by
/// a bare unit test does not provide one). Full round-trip tests
/// should register the consuming contract with
/// `env.register_contract(…)`, obtain a generated client, and invoke
/// the contract function that internally calls one of the
/// `*_env` helpers.
///
/// The `soroban-sdk` `testutils` feature is needed for this. On SDK
/// `22.0.0` that feature is **not compilable** due to an upstream
/// `ed25519-dalek` / `rand` trait-graph conflict (see the note in
/// `contracts/storage_ttl/Cargo.toml`). Consumers of this crate who
/// want full round-trip tests should pin `soroban-sdk` ≥ `25.x`,
/// where the conflict is resolved, or use the Futurenet / Testnet
/// RPC for integration testing.
///
/// ## Mock pattern for SDK ≥ 25.x
///
/// ```ignore
/// // In the consuming contract's Cargo.toml:
/// // [dev-dependencies]
/// // soroban-sdk = { version = "25.0.0", features = ["testutils"] }
///
/// use soroban_sdk::{contract, contractimpl, Env};
/// use quittance_expiry_check::require_active_env;
///
/// #[contract]
/// pub struct MyContract;
///
/// #[contractimpl]
/// impl MyContract {
///     pub fn pay(env: Env, expiry: u64) {
///         require_active_env(&env, expiry).unwrap();
///         // … settle payment …
///     }
/// }
///
/// #[cfg(test)]
/// mod test {
///     use super::*;
///     use soroban_sdk::Env;
///
///     #[test]
///     fn pay_rejects_after_expiry() {
///         let env = Env::default();
///         let contract_id = env.register_contract(None, MyContract);
///         let client = MyContractClient::new(&env, &contract_id);
///
///         env.ledger().set_timestamp(1_700_000_500);
///
///         // Exactly at the deadline: rejected (inclusive boundary).
///         let res = client.try_pay(&1_700_000_500_u64);
///         assert!(res.is_err());
///     }
/// }
/// ```
#[doc(hidden)]
pub mod mock_docs {
    // Intentionally empty — this module exists only to carry the
    // doc-comment above so that `cargo doc` renders the testing
    // guidance alongside the public API.
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // Helper: pick a fixed "now" so test failures are easy to read.
    const NOW: u64 = 1_700_000_000;
    const BEFORE: u64 = NOW - 1;
    const EQUAL: u64 = NOW;
    const AFTER: u64 = NOW + 1;
    const FAR_FUTURE: u64 = NOW + 1_000_000;

    // ── is_expired: happy / boundary / rejection ──────────────────────

    #[test]
    fn is_expired_false_when_now_is_strictly_before_expiry() {
        assert!(!is_expired(NOW, AFTER));
        assert!(!is_expired(0, FAR_FUTURE));
        assert!(!is_expired(NOW - 10, NOW));
    }

    #[test]
    fn is_expired_false_when_now_is_far_before_expiry() {
        // e.g. now = 0, expiry = u64::MAX
        assert!(!is_expired(0, u64::MAX));
    }

    #[test]
    fn is_expired_true_when_now_equals_expiry() {
        // Inclusive boundary.
        assert!(is_expired(NOW, EQUAL));
        assert!(is_expired(0, 0));
        assert!(is_expired(u64::MAX, u64::MAX));
    }

    #[test]
    fn is_expired_true_when_now_is_strictly_after_expiry() {
        assert!(is_expired(NOW, BEFORE));
        assert!(is_expired(AFTER, NOW));
        assert!(is_expired(u64::MAX, 0));
    }

    // ── inclusive boundary: exact acceptance criteria ─────────────────
    //
    // Locks the crate's inclusive-boundary contract in the exact shape
    // the task spec asks for, so a regression in either direction is
    // caught even if the broader boundary tests above are refactored.

    #[test]
    fn locks_inclusive_expiry_boundary() {
        let expiry = NOW;

        // is_expired(expiry, expiry) is true: the instant the ledger
        // clock reaches the deadline, the invoice is expired.
        assert!(is_expired(expiry, expiry));

        // is_expired(expiry - 1, expiry) is false: one second before
        // the deadline the invoice is still active.
        assert!(!is_expired(expiry - 1, expiry));

        // require_active at the boundary returns the Expired error.
        assert_eq!(
            require_active(expiry, expiry),
            Err(ExpiryError::AlreadyExpired),
        );
    }

    #[test]
    fn require_active_accepts_the_instant_before_the_boundary() {
        let expiry = NOW;

        // One second before the deadline is still within the window.
        assert_eq!(require_active(expiry - 1, expiry), Ok(()));
    }

    // ── require_active: happy / rejection ─────────────────────────────

    #[test]
    fn require_active_ok_when_now_is_strictly_before_expiry() {
        assert_eq!(require_active(NOW, AFTER), Ok(()));
        assert_eq!(require_active(0, u64::MAX), Ok(()));
        assert_eq!(require_active(NOW - 1, NOW), Ok(()));
    }

    #[test]
    fn require_active_err_at_boundary_inclusive() {
        // now == expiry must be rejected (inclusive boundary).
        assert_eq!(
            require_active(NOW, EQUAL),
            Err(ExpiryError::AlreadyExpired),
        );
        assert_eq!(require_active(0, 0), Err(ExpiryError::AlreadyExpired));
        assert_eq!(
            require_active(u64::MAX, u64::MAX),
            Err(ExpiryError::AlreadyExpired),
        );
    }

    #[test]
    fn require_active_err_when_now_is_strictly_after_expiry() {
        assert_eq!(
            require_active(NOW, BEFORE),
            Err(ExpiryError::AlreadyExpired),
        );
        assert_eq!(
            require_active(AFTER, NOW),
            Err(ExpiryError::AlreadyExpired),
        );
        assert_eq!(require_active(u64::MAX, 0), Err(ExpiryError::AlreadyExpired));
    }

    #[test]
    fn require_active_consistent_with_is_expired() {
        // The require helper must agree with the predicate on every
        // interesting boundary case.
        for (now, expiry) in [
            (NOW, BEFORE),
            (NOW, EQUAL),
            (NOW, AFTER),
            (0, 0),
            (0, 1),
            (1, 0),
            (u64::MAX, u64::MAX),
            (u64::MAX - 1, u64::MAX),
            (u64::MAX, u64::MAX - 1),
        ] {
            assert_eq!(
                require_active(now, expiry).is_ok(),
                !is_expired(now, expiry),
                "require_active disagreed with is_expired for now={now}, expiry={expiry}",
            );
        }
    }

    // ── require_future_expiry: happy / rejection ──────────────────────

    #[test]
    fn require_future_expiry_ok_when_expiry_is_strictly_after_now() {
        assert_eq!(require_future_expiry(NOW, AFTER), Ok(()));
        assert_eq!(require_future_expiry(0, FAR_FUTURE), Ok(()));
        assert_eq!(require_future_expiry(NOW, NOW + 1), Ok(()));
    }

    #[test]
    fn require_future_expiry_err_when_expiry_equals_now() {
        // expiry == now is rejected: the deadline must be strictly in
        // the future, not the present moment.
        assert_eq!(
            require_future_expiry(NOW, EQUAL),
            Err(ExpiryError::ExpiryNotFuture),
        );
        assert_eq!(
            require_future_expiry(0, 0),
            Err(ExpiryError::ExpiryNotFuture),
        );
        assert_eq!(
            require_future_expiry(u64::MAX, u64::MAX),
            Err(ExpiryError::ExpiryNotFuture),
        );
    }

    #[test]
    fn require_future_expiry_err_when_expiry_is_in_the_past() {
        assert_eq!(
            require_future_expiry(NOW, BEFORE),
            Err(ExpiryError::ExpiryNotFuture),
        );
        assert_eq!(
            require_future_expiry(AFTER, NOW),
            Err(ExpiryError::ExpiryNotFuture),
        );
        assert_eq!(
            require_future_expiry(u64::MAX, 0),
            Err(ExpiryError::ExpiryNotFuture),
        );
    }

    #[test]
    fn require_future_expiry_distinguishes_strict_and_non_strict() {
        // The two siblings must reject opposite-but-adjacent inputs
        // distinctly — protect against future regressions where one
        // helper is silently widened to match the other.
        assert_eq!(require_future_expiry(NOW, NOW + 1), Ok(()));
        assert_eq!(
            require_future_expiry(NOW + 1, NOW + 1),
            Err(ExpiryError::ExpiryNotFuture),
        );

        assert_eq!(require_active(NOW, NOW + 1), Ok(()));
        assert_eq!(
            require_active(NOW + 1, NOW + 1),
            Err(ExpiryError::AlreadyExpired),
        );
    }

    // ── Create-then-pay lifecycle integration ─────────────────────────

    #[test]
    fn create_then_pay_lifecycle_ok() {
        let now = NOW;
        let expiry = AFTER;

        // At creation time: require_future_expiry must accept.
        assert!(require_future_expiry(now, expiry).is_ok());

        // Right after creation: require_active must accept.
        assert!(require_active(now, expiry).is_ok());

        // At the deadline itself: require_active must reject.
        assert_eq!(
            require_active(expiry, expiry),
            Err(ExpiryError::AlreadyExpired),
        );
    }

    #[test]
    fn create_with_non_future_expiry_is_rejected() {
        let now = NOW;
        let bad_expiry = BEFORE;

        assert_eq!(
            require_future_expiry(now, bad_expiry),
            Err(ExpiryError::ExpiryNotFuture),
        );
    }

    #[test]
    fn pay_after_deadline_is_rejected() {
        let now = NOW;
        let expiry = EQUAL;

        // Just before the deadline: ok.
        assert!(require_active(now - 1, expiry).is_ok());

        // At and after the deadline: rejected.
        assert_eq!(
            require_active(expiry, expiry),
            Err(ExpiryError::AlreadyExpired),
        );
        assert_eq!(
            require_active(expiry + 1, expiry),
            Err(ExpiryError::AlreadyExpired),
        );
    }

    // ── ExpiryError shape ─────────────────────────────────────────────

    #[test]
    fn expiry_error_variants_are_distinct() {
        assert_ne!(ExpiryError::AlreadyExpired, ExpiryError::ExpiryNotFuture);
    }

    #[test]
    fn expiry_error_is_copy_and_clone() {
        let a = ExpiryError::AlreadyExpired;
        let b = a; // Copy
        assert_eq!(a, b);
        assert_eq!(a.clone(), b); // Clone
    }

    #[test]
    fn is_expired_boundary_when_now_equals_expiry() {
        // Pin the inclusive boundary: when payment time equals expiry
        // the invoice is expired (now >= expiry => expired).
        const NOW: u64 = 1_700_000_000;
        const EQUAL: u64 = NOW;
        assert!(is_expired(NOW, EQUAL), "is_expired must return true when now == expiry (inclusive boundary)");
        assert!(is_expired(0, 0), "is_expired must return true when now == expiry == 0");
    }

    #[test]
    fn require_active_boundary_when_now_equals_expiry() {
        // At the exact deadline, require_active must reject (inclusive boundary).
        const NOW: u64 = 1_700_000_000;
        const EQUAL: u64 = NOW;
        assert_eq!(
            require_active(EQUAL, EQUAL),
            Err(ExpiryError::AlreadyExpired),
            "require_active must reject when now == expiry (inclusive boundary)",
        );
    }

    #[test]
    fn require_future_expiry_boundary_when_expiry_equals_now() {
        // At creation time, expiry == now must be rejected (not strictly future).
        const NOW: u64 = 1_700_000_000;
        const EQUAL: u64 = NOW;
        assert_eq!(
            require_future_expiry(NOW, EQUAL),
            Err(ExpiryError::ExpiryNotFuture),
            "require_future_expiry must reject when expiry == now",
        );
    }

    #[test]
    fn expiry_error_implements_debug() {
        // The crate is `#![no_std]`, so `format!` (which lives in the
        // std prelude) is unavailable inside the test module. We
        // instead assert at compile-time that `ExpiryError` carries
        // the `core::fmt::Debug` impl — that is sufficient proof
        // that printable Debug output exists for both variants.
        fn assert_debug<T: core::fmt::Debug>() {}
        assert_debug::<ExpiryError>();
    }

    // ── Env wrappers: signature-level smoke tests ─────────────────────
    //
    // The `*_env` helpers read `env.ledger().timestamp()`, which
    // requires a full Soroban host that `Env::default()` does NOT
    // provide without the (broken-on-22.0.0) `testutils` feature.
    // Rather than skip Env coverage entirely, we verify that the
    // wrappers carry the expected types — so SDK signature rot is
    // caught at compile time.

    #[test]
    fn is_expired_env_signature_is_stable() {
        // Type-assert the function pointer signature, no execution.
        let _: fn(&Env, u64) -> bool = is_expired_env;
    }

    #[test]
    fn require_active_env_signature_is_stable() {
        let _: fn(&Env, u64) -> Result<(), ExpiryError> = require_active_env;
    }

    #[test]
    fn env_wrappers_exist_and_link() {
        // Verify the wrappers are reachable from this module and
        // are exposed under the documented names. We deliberately
        // do NOT call them here — `env.ledger()` panics on a bare
        // Env::default() without the testutils feature.
        let _fns: (fn(&Env, u64) -> bool, fn(&Env, u64) -> Result<(), ExpiryError>) =
            (is_expired_env, require_active_env);
    }
}
