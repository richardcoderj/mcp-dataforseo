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

# Set environment variables (will be overridden by run configuration)
ENV DATAFORSEO_USERNAME=""
ENV DATAFORSEO_PASSWORD=""

# Run the MCP server
CMD ["node", "index.js"]