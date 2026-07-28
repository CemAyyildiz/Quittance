# Quittance contracts -- local build/test shortcuts.
#
# Run `make test` from this directory to execute the workspace test
# suite. All targets are thin wrappers around `cargo` so they work
# identically in CI (.github/workflows/contracts.yml).

.PHONY: help all build test check fmt clippy clean

help:
	@echo "Available targets:"
	@echo "  make all     - fmt → clippy → check → build → test"
	@echo "  make build   - cargo build  --workspace"
	@echo "  make test    - cargo test   --workspace"
	@echo "  make check   - cargo check  --workspace --all-targets"
	@echo "  make fmt     - cargo fmt --all -- --check"
	@echo "  make clippy  - cargo clippy --workspace --all-targets -- -D warnings"
	@echo "  make clean   - cargo clean"

# Default target: run all checks
all: fmt clippy check build test

build:
	cargo build --workspace

test:
	cargo test --workspace

check:
	cargo check --workspace --all-targets

fmt:
	cargo fmt --all -- --check

clippy:
	cargo clippy --workspace --all-targets -- -D warnings

clean:
	cargo clean
