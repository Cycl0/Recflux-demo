# Use the official Puppeteer image which comes with Chromium and all necessary dependencies.
FROM ghcr.io/puppeteer/puppeteer:22.12.1

# As root, install vercel and create a directory for the app, setting ownership.
USER root
RUN npm install -g vercel && \
    mkdir -p /home/pptruser/app && \
    chown -R pptruser:pptruser /home/pptruser/app

# Switch to the non-root user
USER pptruser

# Set the working directory
WORKDIR /home/pptruser/app

# Copy local code to the container image, ensuring correct ownership.
# This includes the 'template' directory needed for deployments.
COPY --chown=pptruser:pptruser . .

RUN npm install --omit=dev && npm install -g vercel

# Set the environment variable for the port
ENV PORT=3003

# Expose the port the app runs on
EXPOSE 3003

# Run the app when the container launches
CMD ["node", "server.js"] 