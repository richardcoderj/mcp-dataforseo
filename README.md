# DataForSEO MCP Server

A Model Context Protocol (MCP) server for DataForSEO API.

## Installation

This project uses Docker for simplified deployment and usage.

### Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/richardcoderj/mcp-dataforseo.git
   cd mcp-dataforseo
   ```

2. Create a `.env` file with your DataForSEO credentials:
   ```
   DATAFORSEO_USERNAME=your_username
   DATAFORSEO_PASSWORD=your_password
   ```

3. Build the Docker image:
   ```bash
   docker build -t mcp-dataforseo .
   ```

## Running the Server

### Using Docker (Recommended for Local Use)

Run the server using Docker with credentials from your .env file:

```bash
# Load environment variables from .env file
docker run -p 3003:3003 \
  --env-file .env \
  mcp-dataforseo
```

This approach:
- Uses standard Docker command (no docker-compose needed)
- Passes your credentials securely via .env file
- Works well for local development and testing

Test that the server is running:
```bash
curl http://localhost:3003/health
```

### Using Docker Compose (For VPS/Coolify)

For VPS deployments with Coolify, docker-compose is preferred and Coolify will automatically detect environment variables in your compose file:

```bash
# For local testing with docker-compose
# Create a .env file first with required variables
docker-compose up
```

When deploying to Coolify:
1. Push your code to a Git repository or upload it directly to Coolify
2. Coolify will automatically detect environment variables from docker-compose.yml
3. Enter your credentials directly in Coolify's UI instead of using .env files

Required environment variables for Coolify:
- `DATAFORSEO_USERNAME`: Your DataForSEO API username  
- `DATAFORSEO_PASSWORD`: Your DataForSEO API password
- `COOLIFY_FQDN`: Your domain name (e.g., dataforseo-mcp.yourdomain.com)

Docker Compose is preferred for Coolify because:
- It includes Traefik configuration for routing and SSL
- It sets up proper networking for your VPS environment
- Coolify automatically detects and manages environment variables from your compose file

## Integrations

### Using with VS Code Windsurf Extension

Windsurf kan arbeta med MCP-servrar på två sätt: genom att köra dem lokalt eller genom att ansluta till remote-instanser. 

> **VIKTIGT:** Vi rekommenderar starkt att använda den lokala Docker-metoden (Option 1 nedan) när du arbetar med Windsurf. Det finns kända begränsningar i Windsurf gällande anslutning till remote MCP-servrar, vilket ofta resulterar i problem som "Waiting for server to respond to initialize request..." eller att servern inte visas i Windsurf UI. Remote-anslutningar kan fungera med IP-adresser i vissa fall, men är generellt mindre tillförlitliga än lokala Docker-instanser.

#### Option 1: Run Docker Container via Windsurf (Recommended for Local Development)

Create a `.env` file in a secure location with your DataForSEO credentials:
```
DATAFORSEO_USERNAME=your_username
DATAFORSEO_PASSWORD=your_password
```

Then configure Windsurf to start the Docker container by adding the following to your `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "dataforseo": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "--env-file", "/absolute/path/to/.env", "mcp-dataforseo"],
      "env": {}
    }
  }
}
```

Replace `/absolute/path/to/.env` with the absolute path to your .env file, for example: 
- Windows: `C:/Users/yourusername/.env` or `C:/Users/k_rijo3/Documents/Misc/mcp-dataforseo/.env`
- macOS/Linux: `/home/yourusername/.env`

The `docker run` command specifies:
- `--rm`: Remove container after it stops
- `-i`: Interactive mode (necessary for stdin/stdout)
- `--env-file`: Load environment variables from the specified file
- `mcp-dataforseo`: The name of your locally built image

Note: Docker doesn't automatically read .env files - it requires the explicit `--env-file` flag.

If you prefer to keep credentials in the Windsurf config (less recommended), you can use:

```json
{
  "mcpServers": {
    "dataforseo": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-e", "DATAFORSEO_USERNAME=your_username", "-e", "DATAFORSEO_PASSWORD=your_password", "mcp-dataforseo"],
      "env": {}
    }
  }
}
```

#### Option 2: Connect to Running HTTP/SSE Server

Om du redan kör Docker-containern med HTTP-adaptern kan du konfigurera Windsurf för att ansluta till den:

```json
{
  "mcpServers": {
    "dataforseo": {
      "serverUrl": "http://localhost:3003/sse",
      "transport": "sse"
    }
  }
}
```

**Begränsningar med denna metod:**
- Servern kanske inte visas i Windsurf UI även om den är funktionell
- Du kan uppleva problem med initial anslutning eller frånkoppling under längre sessioner
- Windsurf kan fastna i "Waiting for server to respond to initialize request..." tillstånd
- Timeout-inställningar och nätverksproblem kan påverka stabiliteten

#### Option 3: Connect to Remote MCP Server (VPS/Coolify Deployment)

> **Varning:** Detta är den minst tillförlitliga metoden och rekommenderas endast för avancerade användare som är bekväma med felsökning av anslutningsproblem.

Windsurf kan teoretiskt ansluta till din remote MCP-server som distribuerats på Coolify:

```json
{
  "mcpServers": {
    "dataforseo": {
      "serverUrl": "https://your-domain.com/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer your-optional-auth-token"
      }
    }
  }
}
```

**Kända Problem med Remote Anslutning:**
- Windsurf har svårt att etablera och upprätthålla SSE-anslutningar över internet
- Domännamn fungerar ofta sämre än direkta IP-adresser (prova IP om domännamn misslyckas)
- Anslutningen kan verka fungera men Windsurf visar inte servern i sin UI
- Återkommande tidsfrister och "initialiseringsfel" är vanliga
- Återanslutningsmekanismer är begränsade vilket leder till att servern inte återansluter automatiskt

Detta beror på begränsningar i Windsurf's implementering av remote MCP-protokollet, särskilt över SSE-transport, och är inte specifikt för DataForSEO-servern. Dessa begränsningar kan ändras i framtida versioner av Windsurf.

### Windsurf Configuration Location

The mcp_config.json file is typically located at:
- Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
- macOS/Linux: `~/.codeium/windsurf/mcp_config.json`

If the directory doesn't exist, create it first.

### Deploying to VPS with Coolify

This project is pre-configured for deployment with Coolify and Traefik using docker-compose.

1. Clone this repository to your Coolify server or connect your GitHub repository to Coolify.

2. Set the following environment variables directly in Coolify's UI:
   - `DATAFORSEO_USERNAME`: Your DataForSEO API username
   - `DATAFORSEO_PASSWORD`: Your DataForSEO API password
   - `COOLIFY_FQDN`: The domain name for your deployment (example: `dataforseo-mcp.yourdomain.com`)

   Coolify automatically detects these variables from your docker-compose.yml file and prompts you to enter them.

3. Deploy using the provided `docker-compose.yml`.

4. Once deployed, you can access your server at:
   - HTTP API: `https://your-domain.com/`
   - SSE Endpoint: `https://your-domain.com/sse`

## Alternative: Running Without Docker

If you prefer not to use Docker, you can run the server directly:

```bash
# Install dependencies
npm install

# Set credentials as environment variables
export DATAFORSEO_USERNAME=your_username
export DATAFORSEO_PASSWORD=your_password

# Run the HTTP adapter
npm start
# or
node http-adapter.js
```

## Troubleshooting

### Common Issues

1. **Server not showing in Windsurf UI**
   - Make sure you're using Option 1 (Docker via Windsurf)
   - Ensure the Docker image is built correctly with `docker build -t mcp-dataforseo .`

2. **Authentication Errors**
   - Verify your DataForSEO credentials are correct
   - Make sure environment variables are properly passed to the Docker container

3. **Docker Issues**
   - Ensure the Docker image is built with `docker build -t mcp-dataforseo .`
   - Check if port 3003 is already in use by another application

### Verifying Server Status

Use these commands to check if the server is running correctly:

```bash
# For local HTTP adapter
curl http://localhost:3003/health
curl http://localhost:3003/metadata

# For VPS deployment
curl https://your-domain.com/health
curl https://your-domain.com/metadata
```

## Supported Request Types

### SERP API
```json
{
  "type": "dataforseo_serp",
  "keyword": "artificial intelligence",
  "location_code": 2840,
  "language_code": "en",
  "device": "desktop",
  "os": "windows"
}
```

### Keywords Data API
```json
{
  "type": "dataforseo_keywords_data",
  "keywords": ["seo", "search engine optimization"],
  "location_code": 2840,
  "language_code": "en"
}
```

### Backlinks API
```json
{
  "type": "dataforseo_backlinks",
  "target": "example.com",
  "limit": 100
}
```

### On-Page API
```json
{
  "type": "dataforseo_onpage",
  "url": "https://example.com",
  "check_spell": true,
  "enable_javascript": true
}
```

### Domain Analytics API
```json
{
  "type": "dataforseo_domain_analytics",
  "domain": "example.com"
}
```

### App Data API
```json
{
  "type": "dataforseo_app_data",
  "app_id": "com.example.app"
}
```

### Merchant API
```json
{
  "type": "dataforseo_merchant",
  "keyword": "bluetooth speakers",
  "location_code": 2840,
  "language_code": "en"
}
```

### Business Data API
```json
{
  "type": "dataforseo_business_data",
  "keyword": "pizza delivery",
  "location_code": 2840,
  "language_code": "en"
}
```

## Integration Example

Here's how to use this MCP server in your Node.js code:

```javascript
const { spawn } = require('child_process');

// Start the MCP server
const server = spawn('npx', ['@skobyn/mcp-dataforseo', '--config', '{"username":"your_username","password":"your_password"}']);

// Define the request
const request = {
  type: 'dataforseo_serp',
  keyword: 'artificial intelligence'
};

// Send the request
server.stdin.write(JSON.stringify(request) + '\n');
server.stdin.end();

// Process the response
server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  console.log(response);
});

// Handle errors
server.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});
```

## Environment Variables

You can also use environment variables instead of the config:

```bash
export DATAFORSEO_USERNAME=your_username
export DATAFORSEO_PASSWORD=your_password
npx @skobyn/mcp-dataforseo
```

## Publishing

To publish this package to npm:

1. Login to npm if not already logged in:
   ```bash
   npm login
   ```

2. Publish the package:
   ```bash
   npm publish --access public
   ```

3. To update the package later:
   ```bash
   npm version patch
   npm publish
   ```