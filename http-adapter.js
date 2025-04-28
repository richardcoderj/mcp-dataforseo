#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3003;

// Förbättrad timeout-hantering
const SERVER_TIMEOUT = 30 * 60 * 1000; // 30 minuter

// Helper function to detect Windsurf clients
function isWindsurfClient(req) {
  return req.headers['user-agent']?.includes('Windsurf') || 
         req.headers['x-windsurf-client'] === 'true' ||
         req.query?.client === 'windsurf';
}

// Enable CORS for all routes with permissive settings
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Öka timeout-gränserna för alla anslutningar
app.use((req, res, next) => {
  req.setTimeout(SERVER_TIMEOUT);
  res.setTimeout(SERVER_TIMEOUT);
  next();
});

// Log diagnostic information
console.log(`HTTP adapter starting on port ${port}`);
console.log('DataForSEO MCP HTTP Adapter ready');
console.log('Environment variables check:');
console.log(`- DATAFORSEO_USERNAME present: ${!!process.env.DATAFORSEO_USERNAME}`);
console.log(`- DATAFORSEO_PASSWORD present: ${!!process.env.DATAFORSEO_PASSWORD}`);
console.log(`- PORT: ${port}`);

// Enkel MCP-metadata-endpunkt som vissa klienter anropar först
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Client IP:', req.ip);
  console.log('Is Windsurf client:', isWindsurfClient(req));
  
  res.json({
    name: "DataForSEO MCP Server",
    version: "1.0.0",
    description: "Model Context Protocol server for DataForSEO API",
    serverName: "dataforseo", // Explicit server name för Windsurf
    endpoints: ["/", "/mcp", "/sse", "/api/metadata"],
    status: "ready"
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Ping endpoint for MCP clients
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Explicit WindSurf-kompatibel initiering
app.post('/initialize', (req, res) => {
  console.log('Explicit initialize endpoint called');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Request body:', JSON.stringify(req.body));
  
  res.json({
    type: "initialize_response",
    status: "ready",
    version: "1.0.0",
    tools: [
      {
        name: "dataforseo_serp",
        description: "Search Engine Results Page data from DataForSEO"
      },
      {
        name: "dataforseo_keywords_data",
        description: "Keyword search volume and metrics"
      },
      {
        name: "dataforseo_backlinks",
        description: "Backlink data for websites"
      },
      {
        name: "dataforseo_onpage",
        description: "On-page SEO analysis"
      }
    ]
  });
});

// Ny endpoints för listning av verktyg
app.post('/tools/list', (req, res) => {
  res.json({
    type: "tools/list_response",
    tools: [
      {
        name: "dataforseo_serp",
        description: "Search Engine Results Page data from DataForSEO"
      },
      {
        name: "dataforseo_keywords_data",
        description: "Keyword search volume and metrics"
      },
      {
        name: "dataforseo_backlinks",
        description: "Backlink data for websites"
      },
      {
        name: "dataforseo_onpage",
        description: "On-page SEO analysis"
      }
    ]
  });
});

// Förbättrad SSE implementation
app.get('/sse', (req, res) => {
  console.log('SSE connection requested');
  console.log('Headers:', JSON.stringify(req.headers));
  
  // Sätt korrekta headers för SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Skicka standardevents för att etablera anslutningen
  res.write('event: open\ndata: connected\n\n');
  
  // Skicka initialiseringsevents 
  res.write(`data: {"type":"initialize","status":"ready","version":"1.0.0","tools":[
    "dataforseo_serp",
    "dataforseo_keywords_data",
    "dataforseo_backlinks",
    "dataforseo_onpage",
    "dataforseo_domain_analytics",
    "dataforseo_app_data",
    "dataforseo_merchant",
    "dataforseo_business_data"
  ]}\n\n`);
  
  // Mer frekventa heartbeats
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {"time":${Date.now()}}\n\n`);
    } catch (e) {
      console.error('Error sending heartbeat:', e);
      clearInterval(heartbeatInterval);
    }
  }, 2000);
  
  req.on('close', () => {
    console.log('SSE connection closed by client');
    clearInterval(heartbeatInterval);
  });
  
  res.on('error', (err) => {
    console.error('SSE response error:', err);
    clearInterval(heartbeatInterval);
  });
});

// Alternative SSE endpoint
app.get('/api/sse', (req, res) => {
  console.log('API SSE endpoint requested');
  return app.get('/sse')(req, res);
});

// Handle MCP requests
function handleMcpRequest(req, res) {
  console.log(`Received MCP request: ${req.method} ${req.path}`);
  console.log(`Request headers: ${JSON.stringify(req.headers)}`);
  console.log(`Request body: ${JSON.stringify(req.body)}`);
  console.log(`Client IP: ${req.ip}`);
  console.log(`Is Windsurf client: ${isWindsurfClient(req)}`);
  
  // Specialhantering för initialize-anrop
  if (req.body && (req.body.type === "initialize" || req.body.method === "initialize")) {
    console.log('Handling initialize request');
    
    return res.json({
      type: "initialize_response",
      status: "ready",
      version: "1.0.0",
      tools: [
        {
          name: "dataforseo_serp",
          description: "Search Engine Results Page data from DataForSEO"
        },
        {
          name: "dataforseo_keywords_data",
          description: "Keyword search volume and metrics"
        },
        {
          name: "dataforseo_backlinks",
          description: "Backlink data for websites"
        },
        {
          name: "dataforseo_onpage",
          description: "On-page SEO analysis"
        }
      ]
    });
  }
  
  // Specialhantering för listTools-anrop
  if (req.body && req.body.method === "tools/list") {
    return res.json({
      type: "tools/list_response",
      tools: [
        {
          name: "dataforseo_serp",
          description: "Search Engine Results Page data from DataForSEO"
        },
        {
          name: "dataforseo_keywords_data",
          description: "Keyword search volume and metrics"
        },
        {
          name: "dataforseo_backlinks",
          description: "Backlink data for websites"
        },
        {
          name: "dataforseo_onpage",
          description: "On-page SEO analysis"
        }
      ]
    });
  }
  
  // Check if credentials exist
  if (!process.env.DATAFORSEO_USERNAME || !process.env.DATAFORSEO_PASSWORD) {
    console.error('Missing DataForSEO credentials in environment variables');
    return res.status(500).json({
      error: "Missing DataForSEO credentials",
      message: "Please provide DATAFORSEO_USERNAME and DATAFORSEO_PASSWORD environment variables"
    });
  }
  
  // Spawn the MCP server as a child process
  const mcpServer = spawn('node', ['index.js'], {
    env: {
      ...process.env,
      // Pass through DataForSEO credentials
      DATAFORSEO_USERNAME: process.env.DATAFORSEO_USERNAME,
      DATAFORSEO_PASSWORD: process.env.DATAFORSEO_PASSWORD
    }
  });
  
  let responseData = '';
  let errorData = '';
  
  mcpServer.stdout.on('data', (data) => {
    responseData += data.toString();
    console.log(`MCP stdout: ${data}`);
  });
  
  mcpServer.stderr.on('data', (data) => {
    errorData += data.toString();
    console.error(`MCP stderr: ${data}`);
  });
  
  mcpServer.on('close', (code) => {
    console.log(`MCP process exited with code ${code}`);
    
    if (code !== 0 && !responseData) {
      return res.status(500).send({ 
        error: `MCP server exited with code ${code}`, 
        details: errorData 
      });
    }
    
    try {
      // Handle multiple JSON objects in the response
      // Split by newlines and take the last valid JSON object
      const jsonObjects = responseData.trim().split('\n');
      let lastValidJson = null;
      
      // Try to parse each line as JSON, keep the last valid one
      for (const jsonStr of jsonObjects) {
        try {
          if (jsonStr.trim()) {
            lastValidJson = JSON.parse(jsonStr.trim());
          }
        } catch (err) {
          console.error(`Error parsing JSON line: ${err.message}`);
        }
      }
      
      if (lastValidJson) {
        res.json(lastValidJson);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error(`Error processing MCP response: ${error.message}`);
      console.error(`Raw response: ${responseData}`);
      res.status(500).send({ 
        error: 'Failed to process MCP response',
        details: error.message,
        raw: responseData
      });
    }
  });
  
  // Send the request to the MCP server
  mcpServer.stdin.write(JSON.stringify(req.body) + '\n');
  mcpServer.stdin.end();
}

// Primary MCP endpoint
app.post('/mcp', handleMcpRequest);

// Also support root endpoint for backward compatibility
app.post('/', handleMcpRequest);

// Support standard MCP endpoint patterns
app.post('/api/mcp', handleMcpRequest);

// Specific endpoint för Windsurf
app.post('/v1/completions', handleMcpRequest);

// Basic metadata endpoint
app.get('/metadata', (req, res) => {
  res.json({
    name: "DataForSEO MCP Server",
    version: "1.0.0",
    description: "Model Context Protocol server for DataForSEO API",
    serverName: "dataforseo", // Explicit server name för Windsurf
    tools: [
      "dataforseo_serp",
      "dataforseo_keywords_data", 
      "dataforseo_backlinks",
      "dataforseo_onpage",
      "dataforseo_domain_analytics",
      "dataforseo_app_data",
      "dataforseo_merchant",
      "dataforseo_business_data"
    ]
  });
});

// Support alternative metadata endpoint
app.get('/api/metadata', (req, res) => {
  return app.get('/metadata')(req, res);
});

// Handle requests to /v1/chat/completions endpoint (OpenAI compatibility mode)
app.post('/v1/chat/completions', (req, res) => {
  console.log('Received OpenAI compatibility request');
  console.log('Headers:', JSON.stringify(req.headers));
  
  // Fix för Windsurf-kompatibilitet
  let body = { type: "initialize" };
  if (req.body && req.body.messages) {
    // Om det finns messages, analysera dem för att se om det är en initialiseringsförfrågan
    console.log('Messages found in request:', JSON.stringify(req.body.messages));
  }
  
  req.body = body;
  return handleMcpRequest(req, res);
});

// Catch-all handler for other routes
app.use((req, res) => {
  console.log(`Received request to unhandled route: ${req.method} ${req.path}`);
  res.status(200).json({
    name: "DataForSEO MCP Server",
    version: "1.0.0",
    status: "available"
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`HTTP adapter listening on port ${port}`);
  console.log(`Server is now ready for connections on http://localhost:${port}`);
  console.log(`To test the server, visit http://localhost:${port}/health`);
  console.log(`For Windsurf, ensure port ${port} is correctly mapped in Docker`);
});