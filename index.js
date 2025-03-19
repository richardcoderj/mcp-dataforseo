#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
const crypto = require('crypto');

// Parse the config from command line arguments
let config = {};
try {
  const configArg = process.argv.find(arg => arg.startsWith('--config'));
  if (configArg) {
    const configJson = configArg.split('=')[1] || process.argv[process.argv.indexOf(configArg) + 1];
    config = JSON.parse(configJson);
  }
} catch (error) {
  console.error(`Error parsing config: ${error.message}`);
  process.exit(1);
}

// Configure credentials (from config or environment variables)
const username = config.username || process.env.DATAFORSEO_USERNAME;
const password = config.password || process.env.DATAFORSEO_PASSWORD;

if (!username || !password) {
  console.error('Error: DataForSEO username and password are required in the config or as environment variables (DATAFORSEO_USERNAME, DATAFORSEO_PASSWORD)');
  process.exit(1);
}

// Initialize API client with basic auth
const apiClient = axios.create({
  baseURL: 'https://api.dataforseo.com/v3',
  auth: {
    username: username,
    password: password
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set up readline interface for stdio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Process each line from stdin as a request
rl.on('line', async (line) => {
  try {
    // Parse the incoming JSON request
    const request = JSON.parse(line);
    
    // Generate a unique ID for this request
    const requestId = crypto.randomUUID();
    
    // Process based on request type
    let response;
    
    if (request.type === 'dataforseo_serp') {
      // SERP API request
      const apiResponse = await apiClient.post('/serp/google/organic/live/advanced', [{
        keyword: request.keyword,
        location_code: request.location_code || 2840,
        language_code: request.language_code || "en",
        device: request.device || "desktop",
        os: request.os || "windows"
      }]);
      
      response = {
        type: 'dataforseo_serp',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    } 
    else if (request.type === 'dataforseo_keywords_data') {
      // Keywords Data API request
      const apiResponse = await apiClient.post('/keywords_data/google/search_volume/live', [{
        keywords: request.keywords,
        location_code: request.location_code || 2840,
        language_code: request.language_code || "en"
      }]);
      
      response = {
        type: 'dataforseo_keywords_data',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else if (request.type === 'dataforseo_backlinks') {
      // Backlinks API request
      const apiResponse = await apiClient.post('/backlinks/summary/live', [{
        target: request.target,
        limit: request.limit || 100
      }]);
      
      response = {
        type: 'dataforseo_backlinks',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else if (request.type === 'dataforseo_onpage') {
      // On-Page API request
      const apiResponse = await apiClient.post('/on_page/instant_pages', [{
        url: request.url,
        check_spell: request.check_spell || true,
        enable_javascript: request.enable_javascript || true
      }]);
      
      response = {
        type: 'dataforseo_onpage',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else if (request.type === 'dataforseo_domain_analytics') {
      // Domain Analytics API request
      const apiResponse = await apiClient.post('/domain_analytics/whois/live', [{
        domain: request.domain
      }]);
      
      response = {
        type: 'dataforseo_domain_analytics',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else if (request.type === 'dataforseo_app_data') {
      // App Data API request
      const apiResponse = await apiClient.post('/app_data/google/app_info/live', [{
        app_id: request.app_id
      }]);
      
      response = {
        type: 'dataforseo_app_data',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else if (request.type === 'dataforseo_merchant') {
      // Merchant API request
      const apiResponse = await apiClient.post('/merchant/google/products/live', [{
        keyword: request.keyword,
        location_code: request.location_code || 2840,
        language_code: request.language_code || "en"
      }]);
      
      response = {
        type: 'dataforseo_merchant',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else if (request.type === 'dataforseo_business_data') {
      // Business Data API request
      const apiResponse = await apiClient.post('/business_data/google/my_business_info/live', [{
        keyword: request.keyword,
        location_code: request.location_code || 2840,
        language_code: request.language_code || "en"
      }]);
      
      response = {
        type: 'dataforseo_business_data',
        id: requestId,
        results: apiResponse.data.tasks[0].result,
        status: 'success'
      };
    }
    else {
      response = {
        type: 'error',
        id: requestId,
        error: 'Unsupported request type',
        status: 'error'
      };
    }
    
    // Send response back to stdout
    console.log(JSON.stringify(response));
  } catch (error) {
    // Handle errors
    const errorResponse = {
      type: 'error',
      error: error.message,
      status: 'error'
    };
    
    // Add API response details if available
    if (error.response && error.response.data) {
      errorResponse.details = error.response.data;
    }
    
    console.log(JSON.stringify(errorResponse));
  }
});

// Log startup information to stderr (won't affect the protocol)
console.error('DataForSEO MCP Server started and waiting for requests...');