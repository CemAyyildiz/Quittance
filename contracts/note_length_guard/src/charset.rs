/// Printable ASCII includes the space-through-tilde byte range.
#[inline]
pub(crate) const fn is_printable_ascii(byte: u8) -> bool {
    byte >= 0x20 && byte <= 0x7e
}
