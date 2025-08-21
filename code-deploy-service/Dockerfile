# Use a Puppeteer base image aligned with Node 22.12 to satisfy modern toolchains (e.g., Vite 7)
FROM ghcr.io/puppeteer/puppeteer:22.12.0

# Switch to root user to install global dependencies
USER root

# Install Node.js 22 to satisfy modern toolchains (e.g., Vite 7) and Vercel CLI
RUN apt-get update \
    && apt-get install -y curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g vercel \
    && node -v \
    && npm -v \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and app directory
RUN mkdir -p /home/pptruser/app && \
    chown -R pptruser:pptruser /home/pptruser/app

# Switch to the non-root user
USER pptruser

# Set the working directory
WORKDIR /home/pptruser/app

# Copy application dependency manifests and install dependencies
# This leverages Docker's layer caching to speed up builds
COPY --chown=pptruser:pptruser package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application code
COPY --chown=pptruser:pptruser . .

# Set the environment variable for the port
ENV PORT=3003
ENV THUMBNAIL_API_KEY=""
ENV OPENROUTER_API_KEY=""
ENV OPENAI_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=""
ENV NEXT_PUBLIC_SUPABASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ENV STRIPE_SECRET_KEY=""
ENV STRIPE_WEBHOOK_SECRET=""
ENV SUPABASE_SERVICE_ROLE_KEY=""
ENV KAFKA_BROKERS=""
ENV VERCEL_TOKEN=""

# Expose the port the app runs on
EXPOSE 3003

# Run the app when the container launches
CMD ["node", "server.js"] 