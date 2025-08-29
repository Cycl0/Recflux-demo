#!/usr/bin/env bash
set -euo pipefail

echo "[ENTRYPOINT] Starting WhatsApp integration container"

# Log Anthropic-compatible configuration for debugging
echo "[ENTRYPOINT] ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-}"
if [ -n "${ANTHROPIC_AUTH_TOKEN:-}${ANTHROPIC_API_KEY:-}" ]; then
  echo "[ENTRYPOINT] Found Anthropic-compatible API key"
else
  echo "[ENTRYPOINT] Warning: No Anthropic-compatible API key provided"
fi

# Ensure project workspace exists and is writable
mkdir -p "${CLONED_TEMPLATE_DIR}"

# Always replace project with fresh template on startup if template exists
if [ -d "/_template" ]; then
  echo "[ENTRYPOINT] Replacing project with fresh template from /_template into ${CLONED_TEMPLATE_DIR}"
  rm -rf "${CLONED_TEMPLATE_DIR}"/*
  cp -R /_template/. "${CLONED_TEMPLATE_DIR}"
else
  echo "[ENTRYPOINT] No /_template directory found, keeping existing project"
fi

# Ensure workspace ownership (user created by Dockerfile)
chown -R appuser:appuser "/workspace" || true
chown -R appuser:appuser "/app" || true

echo "[ENTRYPOINT] Dropping privileges to appuser"
exec gosu appuser:appuser "$@"



