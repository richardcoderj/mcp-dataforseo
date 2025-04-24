FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Ensure the scripts are executable
RUN chmod +x index.js http-adapter.js

# Set environment variables (will be overridden by run configuration)
ENV DATAFORSEO_USERNAME=""
ENV DATAFORSEO_PASSWORD=""
ENV PORT=3000

# Expose the HTTP adapter port
EXPOSE 3000

# Run the HTTP adapter instead of direct MCP server
CMD ["node", "http-adapter.js"]