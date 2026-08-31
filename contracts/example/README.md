# quittance-contracts-example

Workspace smoke-test crate for the Quittance contracts workspace.

This crate exists so the `contracts/` workspace always has at least one
build and test target. It contains no contract logic — just a trivial
assertion that verifies the workspace toolchain compiles and `cargo test`
runs end-to-end. New on-chain contract crates should be added alongside
this one as additional `[workspace] members` in the top-level
`contracts/Cargo.toml`.

## Test

From the repository root:

```sh
cargo test -p quittance-contracts-example
```

Or from inside `contracts/`:

```sh
cargo test -p quittance-contracts-example
```

Both invocations run the `workspace_smoke` test, which asserts `2 + 2 == 4`.
If this test passes, the workspace toolchain is working correctly.

## License

MIT
