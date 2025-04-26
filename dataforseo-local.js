#!/usr/bin/env node

const { Server, Tool } = require('@modelcontextprotocol/sdk');
const axios = require('axios');

// Skapa en MCP-server
const server = new Server({
  name: 'dataforseo',
  version: '1.0.0',
  description: 'DataForSEO API via MCP'
});

// Konfigurera API-nycklar (kommer hämtas från miljövariabler när servern startas)
const DATAFORSEO_API = {
  username: process.env.DATAFORSEO_USERNAME || '',
  password: process.env.DATAFORSEO_PASSWORD || '',
  baseURL: 'https://api.dataforseo.com/v3'
};

// Hjälpfunktion för att göra API-anrop till DataForSEO
async function callDataForSEOApi(endpoint, data) {
  try {
    const response = await axios({
      method: 'post',
      url: `${DATAFORSEO_API.baseURL}/${endpoint}`,
      auth: {
        username: DATAFORSEO_API.username,
        password: DATAFORSEO_API.password
      },
      data: data,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error calling DataForSEO API: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Registrera SERP-verktyget
server.registerTool({
  name: 'dataforseo_serp',
  description: 'Search Engine Results Page data from DataForSEO',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'Search query'
      },
      location_name: {
        type: 'string',
        description: 'Location name (e.g., "United States" or "New York,New York,United States")'
      },
      language_name: {
        type: 'string',
        description: 'Language name (e.g., "English")'
      },
      se_name: {
        type: 'string',
        description: 'Search engine name (e.g., "google", "bing")',
        default: 'google'
      }
    },
    required: ['keyword']
  },
  handler: async (params) => {
    console.log(`SERP Search: ${params.keyword}`);
    
    const data = [
      {
        keyword: params.keyword,
        location_name: params.location_name || "United States",
        language_name: params.language_name || "English",
        se_name: params.se_name || "google"
      }
    ];
    
    const result = await callDataForSEOApi('serp/google/organic/live/advanced', data);
    return result;
  }
});

// Registrera Keywords Data-verktyget
server.registerTool({
  name: 'dataforseo_keywords_data',
  description: 'Keyword search volume and metrics',
  parameters: {
    type: 'object',
    properties: {
      keywords: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'List of keywords to get data for'
      },
      location_code: {
        type: 'integer',
        description: 'Location code (e.g., 2840 for United States)'
      },
      language_code: {
        type: 'integer',
        description: 'Language code (e.g., 1033 for English)'
      }
    },
    required: ['keywords']
  },
  handler: async (params) => {
    console.log(`Keywords Data: ${params.keywords.join(', ')}`);
    
    const data = [
      {
        keywords: params.keywords,
        location_code: params.location_code || 2840,
        language_code: params.language_code || 1033
      }
    ];
    
    const result = await callDataForSEOApi('keywords_data/google/search_volume/live', data);
    return result;
  }
});

// Registrera Backlinks-verktyget
server.registerTool({
  name: 'dataforseo_backlinks',
  description: 'Backlink data for websites',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Target URL or domain'
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results',
        default: 10
      }
    },
    required: ['target']
  },
  handler: async (params) => {
    console.log(`Backlinks for: ${params.target}`);
    
    const data = [
      {
        target: params.target,
        limit: params.limit || 10
      }
    ];
    
    const result = await callDataForSEOApi('backlinks/summary/live', data);
    return result;
  }
});

// Registrera On-page-verktyget
server.registerTool({
  name: 'dataforseo_onpage',
  description: 'On-page SEO analysis',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to analyze'
      }
    },
    required: ['url']
  },
  handler: async (params) => {
    console.log(`On-page analysis for: ${params.url}`);
    
    // Först skapar vi en task
    const taskData = [
      {
        url: params.url
      }
    ];
    
    const taskResult = await callDataForSEOApi('on_page/task_post', taskData);
    const taskId = taskResult.tasks[0].id;
    
    // Vänta lite för att låta analysen köras
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Hämta resultatet
    const result = await callDataForSEOApi(`on_page/summary/${taskId}`, {});
    return result;
  }
});

// Starta servern (med stdio-transport)
server.start();

console.log('DataForSEO MCP Server started');