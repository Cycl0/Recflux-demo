# Use the official Puppeteer image which comes with Chromium and all necessary dependencies.
FROM ghcr.io/puppeteer/puppeteer:22.12.1

# Switch to root user to install global dependencies
USER root

# Install Vercel CLI globally
RUN npm install -g vercel

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

# Expose the port the app runs on
EXPOSE 3003

# Run the app when the container launches
CMD ["node", "server.js"] 