# Use the official Puppeteer image which comes with Chromium and all necessary dependencies.
FROM ghcr.io/puppeteer/puppeteer:22.12.1

# As root, create a directory for the app and set ownership.
USER root
RUN mkdir -p /home/pptruser/app && chown -R pptruser:pptruser /home/pptruser/app

# Switch to the non-root user
USER pptruser

# Now set the working directory
WORKDIR /home/pptruser/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the server script
COPY server.js .

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint to run the server
CMD [ "npm", "start" ] 