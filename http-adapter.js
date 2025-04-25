#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3003;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Store SSE clients
const clients = new Set();

// Log diagnostic information
console.log(`HTTP adapter starting on port ${port}`);
console.log('DataForSEO MCP HTTP Adapter ready');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Ping endpoint for MCP clients
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle OPTIONS requests for CORS preflight
app.options('*', cors());

// Primary MCP endpoint
app.post('/mcp', handleMcpRequest);
app.post('/api/mcp', handleMcpRequest); // Some clients use this path

// Also support root endpoint for backward compatibility
app.post('/', handleMcpRequest);

// Handle MCP requests
function handleMcpRequest(req, res) {
  console.log(`Received MCP request: ${req.method} ${req.path}`);
  console.log(`Request body: ${JSON.stringify(req.body)}`);
  
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
        // Send to all SSE clients if it's a streaming response
        if (lastValidJson.type === 'streaming' && lastValidJson.content) {
          const sseMessage = {
            type: 'streaming',
            id: lastValidJson.id || '',
            content: lastValidJson.content
          };
          
          clients.forEach(client => {
            client.write(`data: ${JSON.stringify(sseMessage)}\n\n`);
          });
        }
        
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

// SSE endpoint implementation for Windsurf
app.get('/sse', (req, res) => {
  console.log('SSE connection requested');
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send an initial message to establish the connection
  res.write('event: open\ndata: connected\n\n');
  
  // Send info about DataForSEO tools
  const toolsInfo = {
    type: 'tools',
    tools: [
      {
        name: 'dataforseo_serp',
        description: 'Search Engine Results Page data from DataForSEO'
      },
      {
        name: 'dataforseo_keywords_data',
        description: 'Keyword search volume and metrics'
      },
      {
        name: 'dataforseo_backlinks',
        description: 'Backlink data for websites'
      },
      {
        name: 'dataforseo_onpage',
        description: 'On-page SEO analysis'
      },
      {
        name: 'dataforseo_domain_analytics',
        description: 'Domain analysis and metrics'
      },
      {
        name: 'dataforseo_app_data',
        description: 'App store data and metrics'
      },
      {
        name: 'dataforseo_merchant',
        description: 'E-commerce and merchant data'
      },
      {
        name: 'dataforseo_business_data',
        description: 'Business and local listings data'
      }
    ]
  };
  
  res.write(`data: ${JSON.stringify(toolsInfo)}\n\n`);
  
  // Keep the connection alive with a heartbeat
  const heartbeatInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeatInterval);
      return;
    }
    res.write('event: ping\ndata: {"time": ' + Date.now() + '}\n\n');
  }, 10000); // Send heartbeat every 10 seconds
  
  // Store client for broadcasting
  clients.add(res);
  
  // Clean up when client disconnects
  req.on('close', () => {
    console.log('SSE connection closed');
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });
});

// Alternative SSE endpoint
app.get('/api/sse', (req, res) => {
  console.log('Alternative SSE connection requested');
  // Just redirect to the standard SSE handler
  return app.get('/sse')(req, res);
});

// Handle requests to /v1/chat/completions endpoint (OpenAI compatibility mode)
app.post('/v1/chat/completions', (req, res) => {
  console.log('Received OpenAI compatibility request');
  // Forward to MCP handler with proper format translation
  req.body = {
    type: "initialize",
    id: "openai-" + Date.now()
  };
  return handleMcpRequest(req, res);
});

// MCP metadata endpoint
app.get('/api/metadata', (req, res) => {
  console.log('Metadata requested');
  res.json({
    name: "DataForSEO MCP Server",
    version: "1.0.0",
    description: "Model Context Protocol server for DataForSEO API",
    vendor: "DataForSEO",
    capabilities: {
      streaming: true,
      sse: true
    },
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

// Metadata endpoint
app.get('/metadata', (req, res) => {
  console.log('Metadata requested (alt endpoint)');
  // redirect to the standard metadata handler
  return app.get('/api/metadata')(req, res);
});

// Catch-all handler for other routes to avoid 404s
app.use((req, res) => {
  console.log(`Received request to unhandled route: ${req.method} ${req.path}`);
  res.status(200).json({
    name: "DataForSEO MCP Server",
    version: "1.0.0",
    status: "available",
    endpoints: ["/", "/mcp", "/sse", "/api/sse", "/health", "/ping", "/api/metadata", "/metadata"]
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`HTTP adapter listening on port ${port}`);
});