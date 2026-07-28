# Quittance contracts Makefile
#
# Targets
#   make test          — test every crate (workspace members + standalone)
#   make build         — build every crate
#   make test-<crate>  — test a single crate (e.g. make test-error_codes)
#   make build-<crate> — build a single crate
#   make list          — print all known crate directories
#   make help          — print this message
#
# Usage
#   cd contracts && make test
#   cd contracts && make test-error_codes

SHELL := /bin/bash

# ---- Crate inventory ----
#
# Workspace members  (listed in contracts/Cargo.toml, tested via `cargo test` from contracts/)
#   init_once
#   max_amount   (package quittance-max-amount)
#   min_amount   (package quittance-min-amount)

STANDALONE_CRATES := \
	amount_scale \
	asset_allowlist \
	data_key_prefix \
	destination_guard \
	error_codes \
	event_invoice_paid \
	fee_bps_clamp \
	invoice_claim \
	meta_info \
	paid_status \
	payer_bind \
	proof_meta \
	quittance_receipt_hash \
	seller_bind \
	status_transitions \
	storage_ttl \
	usdc_testnet_issuer

.PHONY: help list test build test-workspace build-workspace \
        $(addprefix test-,$(STANDALONE_CRATES)) \
        $(addprefix build-,$(STANDALONE_CRATES))

help:
	@echo "Quittance contracts Makefile"
	@echo ""
	@echo "  make test                Test all crates (workspace + standalone)"
	@echo "  make build               Build all crates"
	@echo "  make test-<dir>         Test a single crate (e.g. make test-error_codes)"
	@echo "  make build-<dir>        Build a single crate"
	@echo "  make list                List all known crate directories"
	@echo "  make help                This message"
	@echo ""
	@echo "Standalone crates: $(STANDALONE_CRATES)"

list:
	@echo "Workspace members:  init_once  max_amount  min_amount"
	@echo "Standalone crates:"
	@for dir in $(STANDALONE_CRATES); do echo "  $$dir"; done

# ------------------------------------------------------------------
# Test targets
# ------------------------------------------------------------------

test: test-workspace test-standalone

# Workspace members — tested together via the virtual workspace
test-workspace:
	@echo "=== Testing workspace members ==="
	cargo test $(CARGO_FLAGS)

# Standalone crates — each is tested via its own manifest path
test-standalone: $(addprefix test-,$(STANDALONE_CRATES))

# Pattern rule: test-<dirname> => cargo test --manifest-path <dir>/Cargo.toml
#
# Using --manifest-path avoids workspace membership issues: some crates
# declare their own [workspace] table, others do not.  --manifest-path
# works correctly regardless.
define TEST_CRATE_template
test-$(1):
	@echo "=== Testing $$@ ==="
	cargo test --manifest-path $(1)/Cargo.toml $(CARGO_FLAGS)
endef

$(foreach crate,$(STANDALONE_CRATES),$(eval $(call TEST_CRATE_template,$(crate))))

# ------------------------------------------------------------------
# Build targets
# ------------------------------------------------------------------

build: build-workspace build-standalone

build-workspace:
	@echo "=== Building workspace members ==="
	cargo build $(CARGO_FLAGS)

build-standalone: $(addprefix build-,$(STANDALONE_CRATES))

define BUILD_CRATE_template
build-$(1):
	@echo "=== Building $$@ ==="
	cargo build --manifest-path $(1)/Cargo.toml $(CARGO_FLAGS)
endef

$(foreach crate,$(STANDALONE_CRATES),$(eval $(call BUILD_CRATE_template,$(crate))))
