# Use the official Playwright image which is designed for this purpose
FROM mcr.microsoft.com/playwright:v1.53.2-jammy

# Switch to root to create and own the app directory
USER root
WORKDIR /app

# Copy application files
COPY package*.json ./
COPY server.js .

# Install npm dependencies
RUN npm install

# The Playwright base image already has the browsers and dependencies,
# so the `npx playwright install` command is no longer needed.
# This greatly simplifies the setup.

# Change ownership of the app directory to the non-root user 'pwuser'
# that comes with the base image
RUN chown -R pwuser:pwuser /app

# Switch to the non-root user to run the application
USER pwuser

# Expose the port the app runs on
EXPOSE 3002

# Set the entrypoint to run the server
CMD [ "npm", "start" ] 