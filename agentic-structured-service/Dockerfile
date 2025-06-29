# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install --omit=dev

# Copy local code to the container image.
COPY . .

# Set the environment variable for the port
ENV PORT 3001

# Expose the port the app runs on
EXPOSE 3001

# Run the web service on container startup.
CMD [ "npm", "start" ] 