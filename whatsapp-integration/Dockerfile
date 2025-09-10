FROM node:22.12.0-bookworm AS builder

WORKDIR /app

# Install all deps (including dev) to build
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx tsc -p tsconfig.json

FROM node:22.12.0-bookworm AS runtime

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Build and install cline CLI from source
COPY cline-cli /tmp/cline-cli
WORKDIR /tmp/cline-cli
RUN npm ci && npm run build && npm link
WORKDIR /app

# Install Python, gosu and Chrome dependencies for Puppeteer and Crawl4AI
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    gosu \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install Crawl4AI in a dedicated virtualenv (avoid PEP 668 system site-packages restrictions)
RUN python3 -m venv /opt/crawl4ai-venv \
    && /opt/crawl4ai-venv/bin/pip install --upgrade pip \
    && /opt/crawl4ai-venv/bin/pip install crawl4ai \
    && ln -sf /opt/crawl4ai-venv/bin/crwl /usr/local/bin/crwl \
    && ln -sf /opt/crawl4ai-venv/bin/crawl4ai-setup /usr/local/bin/crawl4ai-setup

# Run crawl4ai-setup as root first
RUN crawl4ai-setup

# Install playwright system dependencies as root first
RUN /opt/crawl4ai-venv/bin/playwright install-deps chromium

# Create non-root user with home directory
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

# Install playwright browsers as appuser (this ensures they're in the right location)
USER appuser
RUN /opt/crawl4ai-venv/bin/playwright install chromium

# Switch back to root for the remaining file operations
USER root

# Copy built artifacts and config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp-config.json ./mcp-config.json
COPY --from=builder /app/template /_template
COPY --from=builder /app/default_components ./default_components

# Copy documentation for Cline access
COPY --from=builder /app/docs ./docs


COPY --from=builder /app/src/syntax-fix-prompt.ts ./src/syntax-fix-prompt.ts

# Create cline CLI config directories and copy configs
RUN mkdir -p /home/appuser/.cline_cli/storage/settings
COPY --from=builder /app/cline-config.json /home/appuser/.cline_cli/cline_cli_settings.json
COPY --from=builder /app/cline-config-fix.json /home/appuser/.cline_cli/cline_cli_settings_fix.json
COPY --from=builder /app/cline-mcp-settings.json /home/appuser/.cline_cli/storage/settings/cline_mcp_settings.json

# Add entrypoint to seed project directory if empty
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create workspace directory and change ownership to non-root user
RUN mkdir -p /workspace && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /home/appuser && \
    chown -R appuser:appuser /workspace

# Expose port
ENV PORT=3005
EXPOSE 3005

# Runtime envs (document placeholders)
ENV CLAUDE_AUTH_TOKEN=""
ENV WHATSAPP_TOKEN=""
ENV WHATSAPP_PHONE_NUMBER_ID=""
ENV WHATSAPP_VERIFY_TOKEN=""
ENV MCP_COMMAND="node"
ENV MCP_ARGS="dist/mcp-server.js"
ENV OPENAI_API_KEY=""
ENV OPEN_AI_API_KEY=""
ENV OPEN_ROUTER_API_KEY=""
ENV OPENROUTER_API_KEY=""
ENV GROQ_API_KEY=""
ENV SERVICES_HOST="localhost"
ENV SERVICES_SCHEME="http"
ENV NETLIFY_API_KEY=""
ENV LANGCACHE_API_KEY=""
ENV REDIS_URL=""
ENV REDIS_PASSWORD=""
ENV REDIS_USER=""

# Anthropic-compatible (Moonshot Kimi K2) envs
ENV ANTHROPIC_AUTH_TOKEN=""
ENV ANTHROPIC_API_KEY=""

ENV BROWSERBASE_API_KEY=""
ENV BROWSERBASE_PROJECT_ID=""
ENV PEXELS_API_KEY=""
ENV IMGBB_API_KEY=""
ENV FREEPIK_API_KEY=""

# Project directory inside container (should be a volume)
ENV CLONED_TEMPLATE_DIR="/workspace/project"

# Start with entrypoint as root (will drop privileges to appuser) then run server
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]

