FROM node:22.12.0-bullseye

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy only source needed to build
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npx tsc -p tsconfig.json

# Expose port
ENV PORT=3000
EXPOSE 3000

# Runtime envs (document placeholders)
ENV WHATSAPP_TOKEN=""
ENV WHATSAPP_PHONE_NUMBER_ID=""
ENV WHATSAPP_VERIFY_TOKEN=""
ENV MCP_COMMAND="node"
ENV MCP_ARGS="dist/mcp-server.js"
ENV OPENAI_API_KEY=""
ENV OPENAI_MODEL="gpt-4o-mini"
ENV SERVICES_HOST="localhost"
ENV SERVICES_SCHEME="http"

# Start the webhook server
CMD ["node", "dist/index.js"]

