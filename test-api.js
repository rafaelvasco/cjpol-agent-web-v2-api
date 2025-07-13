#!/usr/bin/env node

const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 4000;
const ENDPOINTS = [
  { path: '/api/health', method: 'GET', name: 'Health Check' }
];

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}=== API Test Script ===${colors.reset}`);
console.log(`${colors.blue}Testing API at ${API_HOST}:${API_PORT}${colors.reset}`);

// Function to make an HTTP request
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: endpoint.path,
      method: endpoint.method
    };

    console.log(`${colors.yellow}Testing ${endpoint.name}: ${endpoint.method} ${endpoint.path}${colors.reset}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const statusColor = res.statusCode >= 200 && res.statusCode < 300 ? colors.green : colors.red;
        console.log(`${statusColor}Status: ${res.statusCode}${colors.reset}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`${colors.cyan}Response: ${JSON.stringify(jsonData, null, 2)}${colors.reset}`);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          console.log(`${colors.cyan}Response: ${data}${colors.reset}`);
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      reject(error);
    });

    req.end();
  });
}

// Main function to run all tests
async function runTests() {
  console.log(`${colors.magenta}Starting tests...${colors.reset}`);
  
  let allPassed = true;
  
  for (const endpoint of ENDPOINTS) {
    try {
      const result = await makeRequest(endpoint);
      
      if (result.status < 200 || result.status >= 300) {
        allPassed = false;
        console.log(`${colors.red}✗ ${endpoint.name} failed with status ${result.status}${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ ${endpoint.name} passed${colors.reset}`);
      }
      
      console.log(''); // Empty line for readability
    } catch (error) {
      allPassed = false;
      console.log(`${colors.red}✗ ${endpoint.name} failed with error: ${error.message}${colors.reset}`);
      console.log(''); // Empty line for readability
    }
  }
  
  if (allPassed) {
    console.log(`${colors.green}All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.red}Some tests failed.${colors.reset}`);
    console.log(`${colors.yellow}Make sure the API server is running on ${API_HOST}:${API_PORT}${colors.reset}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Test script error: ${error.message}${colors.reset}`);
});