# Quittance contracts -- local build/test shortcuts.
#
# Run `make test` from this directory to execute the workspace test
# suite. All targets are thin wrappers around `cargo` so they work
# identically in CI (.github/workflows/contracts.yml).

.PHONY: help build test check fmt clean

help:
	@echo "Available targets:"
	@echo "  make build  - cargo build  --workspace"
	@echo "  make test   - cargo test   --workspace"
	@echo "  make check  - cargo check  --workspace --all-targets"
	@echo "  make fmt    - cargo fmt --all -- --check"
	@echo "  make clean  - cargo clean"

build:
	cargo build --workspace

test:
	cargo test --workspace

check:
	cargo check --workspace --all-targets

fmt:
	cargo fmt --all -- --check

clean:
	cargo clean
