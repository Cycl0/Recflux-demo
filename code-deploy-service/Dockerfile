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

# Set environment variables
ENV PORT 3003
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

# Run the web service on container startup.
CMD [ "npm", "start" ] 