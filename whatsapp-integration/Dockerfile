FROM node:22.12.0-bullseye AS builder

WORKDIR /app

# Install all deps (including dev) to build
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
COPY mcp-config.json ./
COPY template ./_template
RUN npx tsc -p tsconfig.json

FROM node:22.12.0-bullseye AS runtime

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Install Claude Code CLI globally (provides `claude` binary)
RUN npm i -g @anthropic-ai/claude-code@latest

# Install gosu and Chrome dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
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

# Create non-root user with home directory
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

# Copy built artifacts and config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp-config.json ./mcp-config.json
COPY --from=builder /app/_template /_template

# Add entrypoint to seed project directory if empty
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Change ownership to non-root user
RUN chown -R appuser:appuser /app && chown -R appuser:appuser /home/appuser

# Expose port
ENV PORT=3000
EXPOSE 3000

# Runtime envs (document placeholders)
ENV CLAUDE_AUTH_TOKEN=""
ENV WHATSAPP_TOKEN=""
ENV WHATSAPP_PHONE_NUMBER_ID=""
ENV WHATSAPP_VERIFY_TOKEN=""
ENV MCP_COMMAND="node"
ENV MCP_ARGS="dist/mcp-server.js"
ENV OPENAI_API_KEY=""
ENV OPENAI_MODEL="gpt-4o-mini"
ENV SERVICES_HOST="localhost"
ENV SERVICES_SCHEME="http"
ENV PORT=3005

# Anthropic-compatible (Moonshot Kimi K2) envs
ENV ANTHROPIC_AUTH_TOKEN=""
ENV ANTHROPIC_API_KEY=""

ENV BROWSERBASE_API_KEY=""
ENV BROWSERBASE_PROJECT_ID=""
ENV PEXELS_API_KEY=""

# Project directory inside container (should be a volume)
ENV CLONED_TEMPLATE_DIR="/workspace/project"

# Start with entrypoint as root (will drop privileges to appuser) then run server
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]

