use crate::charset::is_printable_ascii;
use soroban_sdk::Bytes;

/// Validate a note's byte length and character set.
pub(crate) fn is_valid_note(note: &Bytes, max_len: u32) -> bool {
    if note.len() > max_len {
        return false;
    }

    note.iter().all(is_printable_ascii)
}
