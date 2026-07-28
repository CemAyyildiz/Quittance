.PHONY: all build test fmt clippy clean

# Default target: run all checks
all: fmt clippy build test

# Compile all workspace crates
build:
	cargo build --workspace

# Run unit tests across all workspace crates
test:
	cargo test --workspace

# Check code formatting
fmt:
	cargo fmt --all --check

# Run clippy lints
clippy:
	cargo clippy --workspace --all-targets -- -D warnings

# Clean build artifacts
clean:
	cargo clean
