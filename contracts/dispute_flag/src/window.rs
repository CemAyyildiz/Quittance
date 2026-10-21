use crate::types::Error;

pub fn deadline(paid_at: u64, window_secs: u64) -> Result<u64, Error> {
    if window_secs == 0 {
        return Err(Error::InvalidWindow);
    }
    paid_at.checked_add(window_secs).ok_or(Error::InvalidWindow)
}

pub fn is_open(paid_at: u64, window_secs: u64, now: u64) -> Result<bool, Error> {
    if now < paid_at {
        return Err(Error::FuturePayment);
    }
    Ok(now <= deadline(paid_at, window_secs)?)
}
