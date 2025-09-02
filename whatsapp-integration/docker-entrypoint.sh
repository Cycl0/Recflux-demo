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

if [ -x "/opt/crawl4ai-venv/bin/crawl4ai-setup" ]; then
  if [ ! -f "/root/.crawl4ai/.post_install_done" ]; then
    echo "[ENTRYPOINT] Running crawl4ai-setup (first run)"
    /opt/crawl4ai-venv/bin/crawl4ai-setup || true
    mkdir -p /root/.crawl4ai
    touch /root/.crawl4ai/.post_install_done
  else
    echo "[ENTRYPOINT] Skipping crawl4ai-setup (already completed)"
  fi
else
  echo "[ENTRYPOINT] crawl4ai-setup not found; skipping"
fi

# Ensure Playwright browsers are installed for appuser (needed by Crawl4AI CLI)
if [ -x "/opt/crawl4ai-venv/bin/playwright" ]; then
  if [ ! -d "/home/appuser/.cache/ms-playwright" ] || [ -z "$(ls -A /home/appuser/.cache/ms-playwright 2>/dev/null)" ]; then
    echo "[ENTRYPOINT] Installing Playwright browsers for appuser"
    gosu appuser:appuser /opt/crawl4ai-venv/bin/playwright install chromium || true
  else
    echo "[ENTRYPOINT] Playwright browsers already present; skipping install"
  fi
else
  echo "[ENTRYPOINT] Playwright CLI not found; skipping browser install"
fi

echo "[ENTRYPOINT] Dropping privileges to appuser"
exec gosu appuser:appuser "$@"



