FROM node:18-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

COPY . .

RUN npm install --omit=dev && npm install -g vercel

# Set the environment variable for the port
ENV PORT 3003

# Expose the port the app runs on
EXPOSE 3003

# Run the web service on container startup.
CMD [ "npm", "start" ] 