//! Next due timestamp for a recurring Quittance invoice.
//!
//! [`next_due`] takes an anchor timestamp, a period in seconds, and the
//! current time, and returns the next instant an invoice should be issued.
//! The rules are plain `u64` arithmetic: no Soroban host, no storage, and
//! no dependency on the other crates in this repository.
//!
//! When `now` lands exactly on a due instant (including the anchor itself),
//! the function returns the following occurrence. The current instant is
//! treated as already reached, so the next invoice is one interval later.

#![deny(missing_docs)]
#![forbid(unsafe_code)]

mod schedule;

pub use schedule::{next_due, ScheduleError};
