#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3003;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

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

// Also support root endpoint for backward compatibility
app.post('/', handleMcpRequest);

// Handle MCP requests
function handleMcpRequest(req, res) {
  console.log(`Received request: ${JSON.stringify(req.body)}`);
  
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

// SSE endpoint implementation
app.get('/sse', (req, res) => {
  console.log('SSE connection requested');
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send an initial message to establish the connection
  res.write('data: {"type":"connection_established"}\n\n');
  
  // Keep the connection alive with a heartbeat
  const heartbeatInterval = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 15000); // Send heartbeat every 15 seconds
  
  // Clean up when client disconnects
  req.on('close', () => {
    console.log('SSE connection closed');
    clearInterval(heartbeatInterval);
  });
});

// Handle requests to /v1/chat/completions endpoint (OpenAI compatibility mode)
app.post('/v1/chat/completions', (req, res) => {
  console.log('Received OpenAI compatibility request');
  res.status(200).json({
    id: "mcp-dataforseo-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "dataforseo-mcp",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "This endpoint is for OpenAI compatibility mode. Please use the MCP protocol endpoints for DataForSEO functionality."
        },
        finish_reason: "stop"
      }
    ]
  });
});

// Catch-all handler for other routes to avoid 404s
app.use((req, res) => {
  console.log(`Received request to unhandled route: ${req.method} ${req.path}`);
  res.status(200).json({
    name: "DataForSEO MCP Server",
    version: "1.0.0",
    status: "available",
    endpoints: ["/", "/mcp", "/sse", "/health", "/ping"]
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`HTTP adapter listening on port ${port}`);
});