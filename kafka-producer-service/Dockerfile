# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Set environment variables
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

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Define the command to run your app
CMD [ "npm", "start" ] 