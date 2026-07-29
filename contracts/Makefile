# Quittance contracts -- local build/test shortcuts.
#
# Instead of relying on a workspace member list, every target iterates
# over all subdirectories that contain a Cargo.toml.  This means new
# contract crates are picked up automatically and each crate uses its
# own dependency versions without fighting workspace constraints.
#
# Run `make test` from this directory to execute every contract test.

CONTRACT_DIRS := $(shell find . -mindepth 2 -maxdepth 2 -name Cargo.toml -exec dirname {} \; | sort)

.PHONY: help build test check fmt clippy clean

help:
	@echo "Available targets:"
	@echo "  make build  - cargo build  --workspace"
	@echo "  make test   - cargo test   --workspace"
	@echo "  make check  - cargo check  --workspace --all-targets"
	@echo "  make fmt    - cargo fmt --all -- --check"
	@echo "  make clippy - cargo clippy --workspace -- -D warnings"
	@echo "  make clean  - cargo clean"

build:
	@status=0; for dir in $(CONTRACT_DIRS); do \
		echo "==> Building $$dir..."; \
		(cd "$$dir" && cargo build) || status=1; \
	done; exit $$status

test:
	@status=0; for dir in $(CONTRACT_DIRS); do \
		echo "==> Testing  $$dir..."; \
		(cd "$$dir" && cargo test) || status=1; \
	done; exit $$status

check:
	@status=0; for dir in $(CONTRACT_DIRS); do \
		echo "==> Checking $$dir..."; \
		(cd "$$dir" && cargo check --all-targets) || status=1; \
	done; exit $$status

fmt:
	@status=0; for dir in $(CONTRACT_DIRS); do \
		echo "==> Format   $$dir..."; \
		(cd "$$dir" && cargo fmt -- --check) || status=1; \
	done; exit $$status

clippy:
	@status=0; for dir in $(CONTRACT_DIRS); do \
		echo "==> Clippy   $$dir..."; \
		(cd "$$dir" && cargo clippy --all-targets -- -D warnings) || status=1; \
	done; exit $$status

clippy:
	cargo clippy --workspace -- -D warnings

clean:
	@for dir in $(CONTRACT_DIRS); do \
		(cd "$$dir" && cargo clean); \
	done
