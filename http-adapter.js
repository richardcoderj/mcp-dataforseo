#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 3003;

app.use(express.json());

// Log diagnostic information
console.log(`HTTP adapter starting on port ${port}`);
console.log('DataForSEO MCP HTTP Adapter ready');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Handle all POST requests as MCP requests
app.post('/', (req, res) => {
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
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`HTTP adapter listening on port ${port}`);
});