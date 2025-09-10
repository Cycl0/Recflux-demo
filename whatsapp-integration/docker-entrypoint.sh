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
  mkdir -p "${CLONED_TEMPLATE_DIR:-/workspace/project}"
  cp -R /_template/. "${CLONED_TEMPLATE_DIR:-/workspace/project}/"
  echo "[ENTRYPOINT] Template copied successfully"
fi

# Copy documentation to project workspace for Cline access
if [ -d "/app/docs" ] && [ -f "/app/CLAUDE.md" ]; then
  echo "[ENTRYPOINT] Copying tool documentation to workspace"
  cp -R /app/docs "${CLONED_TEMPLATE_DIR:-/workspace/project}/"
  cp /app/CLAUDE.md "${CLONED_TEMPLATE_DIR:-/workspace/project}/"
  # Also copy the updated syntax-fix-prompt.ts if it exists
  if [ -f "/app/src/syntax-fix-prompt.ts" ]; then
    mkdir -p "${CLONED_TEMPLATE_DIR:-/workspace/project}/src"
    cp /app/src/syntax-fix-prompt.ts "${CLONED_TEMPLATE_DIR:-/workspace/project}/src/"
  fi
  echo "[ENTRYPOINT] Documentation copied successfully"
fi

# Ensure Playwright browsers are available for appuser
BROWSER_DIR="/home/appuser/.cache/ms-playwright"
if [ ! -d "$BROWSER_DIR" ] || [ -z "$(find $BROWSER_DIR -name 'chrome*' -type f 2>/dev/null)" ]; then
  echo "[ENTRYPOINT] Installing Playwright browsers for appuser"
  gosu appuser:appuser /opt/crawl4ai-venv/bin/playwright install chromium || {
    echo "[ENTRYPOINT] Browser installation failed, trying with system deps"
    gosu appuser:appuser /opt/crawl4ai-venv/bin/playwright install-deps chromium
    gosu appuser:appuser /opt/crawl4ai-venv/bin/playwright install chromium
  }
  echo "[ENTRYPOINT] Playwright browser installation completed"
  # List what was installed for debugging
  ls -la "$BROWSER_DIR" 2>/dev/null || echo "[ENTRYPOINT] No browser directory found"
fi

# Fix ownership before installing dependencies (run multiple times to handle cache clearing)
chown -R appuser:appuser "/workspace" 2>/dev/null || true
chown -R appuser:appuser "/app" 2>/dev/null || true
chown -R appuser:appuser "/home/appuser/.cache" 2>/dev/null || true

# Ensure workspace directory has proper permissions for build processes
chmod -R 755 "/workspace" 2>/dev/null || true

# Install dependencies in the project directory as appuser
if [ -f "${CLONED_TEMPLATE_DIR:-/workspace/project}/package.json" ]; then
  echo "[ENTRYPOINT] Installing project dependencies..."
  cd "${CLONED_TEMPLATE_DIR:-/workspace/project}"
  gosu appuser:appuser npm install
  echo "[ENTRYPOINT] Dependencies installed successfully"
fi  

cd /app
exec gosu appuser:appuser "$@"