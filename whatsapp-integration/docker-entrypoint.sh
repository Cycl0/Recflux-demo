#!/bin/bash
set -e

echo "[ENTRYPOINT] Starting WhatsApp integration container"

# Log configuration
echo "[ENTRYPOINT] ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-}"
if [ -n "${ANTHROPIC_AUTH_TOKEN:-}${ANTHROPIC_API_KEY:-}" ]; then
  echo "[ENTRYPOINT] Found Anthropic-compatible API key"
else
  echo "[ENTRYPOINT] Warning: No Anthropic-compatible API key provided"
fi

# Ensure workspace exists
mkdir -p "${CLONED_TEMPLATE_DIR:-/workspace/project}"

# Copy template if exists
if [ -d "/_template" ]; then
  echo "[ENTRYPOINT] Copying fresh template"
  rm -rf "${CLONED_TEMPLATE_DIR:-/workspace/project}"/*
  cp -R /_template/. "${CLONED_TEMPLATE_DIR:-/workspace/project}/"
fi

# Fix ownership before installing dependencies
chown -R appuser:appuser "/workspace" 2>/dev/null || true
chown -R appuser:appuser "/app" 2>/dev/null || true

# Install dependencies in the project directory as appuser
if [ -f "${CLONED_TEMPLATE_DIR:-/workspace/project}/package.json" ]; then
  echo "[ENTRYPOINT] Installing project dependencies..."
  cd "${CLONED_TEMPLATE_DIR:-/workspace/project}"
  gosu appuser:appuser npm install
  echo "[ENTRYPOINT] Dependencies installed successfully"
fi  


echo "[ENTRYPOINT] Starting application as appuser"
cd /app
exec gosu appuser:appuser "$@"