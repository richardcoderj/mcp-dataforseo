FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Ensure the script is executable
RUN chmod +x index.js

# Set the environment variables
ENV NODE_ENV=production

# Run the MCP server
CMD ["node", "index.js"]