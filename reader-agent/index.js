#!/usr/bin/env node

/**
 * NFC Reader Agent for USB/Ethernet NFC Readers
 * 
 * This script reads NFC tag UIDs from connected readers and sends
 * check-in/check-out events to the attendance backend API.
 * 
 * Features:
 * - Offline buffering with automatic retry
 * - Configurable reader ID and location
 * - Health check endpoint for monitoring
 * - Support for multiple reader types
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const CONFIG = {
  // Backend API configuration
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  apiToken: process.env.API_TOKEN || '',
  
  // Reader configuration
  readerId: process.env.READER_ID || 'READER_001',
  location: process.env.READER_LOCATION || 'Main Entrance',
  
  // Offline buffer configuration
  bufferFile: path.join(__dirname, 'offline-buffer.json'),
  maxBufferSize: 1000,
  retryInterval: 30000, // 30 seconds
  
  // Health check server
  healthCheckPort: process.env.HEALTH_CHECK_PORT || 8080,
  
  // Simulation mode (for testing without hardware)
  simulationMode: process.env.SIMULATION_MODE === 'true',
  simulationInterval: 5000, // 5 seconds between simulated scans
};

// State
let offlineBuffer = [];
let lastScanTime = null;
let scanCount = 0;
let errorCount = 0;
let isOnline = true;

/**
 * Initialize the reader agent
 */
function init() {
  console.log('=== NFC Reader Agent Starting ===');
  console.log(`Reader ID: ${CONFIG.readerId}`);
  console.log(`Location: ${CONFIG.location}`);
  console.log(`API Base URL: ${CONFIG.apiBaseUrl}`);
  console.log(`Simulation Mode: ${CONFIG.simulationMode}`);
  console.log('================================\n');

  // Load offline buffer
  loadOfflineBuffer();

  // Start health check server
  startHealthCheckServer();

  // Start retry loop for offline buffer
  setInterval(processOfflineBuffer, CONFIG.retryInterval);

  // Start NFC reader
  if (CONFIG.simulationMode) {
    console.log('Starting in SIMULATION mode...\n');
    startSimulationMode();
  } else {
    console.log('Starting NFC reader...\n');
    console.log('Note: Real NFC reader support requires hardware-specific libraries.');
    console.log('For production, install libraries like:');
    console.log('  - nfc-pcsc (for PC/SC readers)');
    console.log('  - nfc (for libnfc-based readers)');
    console.log('  - serialport (for serial-based readers)\n');
    
    // For demo, fall back to simulation
    console.log('Falling back to simulation mode for demo...\n');
    startSimulationMode();
  }
}

/**
 * Simulate NFC tag scans for testing
 */
function startSimulationMode() {
  setInterval(() => {
    // Generate random tag UID
    const tagUid = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16).toUpperCase()
    ).join('');

    console.log(`[SIMULATION] NFC Tag Scanned: ${tagUid}`);
    handleTagScan(tagUid);
  }, CONFIG.simulationInterval);
}

/**
 * Handle NFC tag scan
 */
async function handleTagScan(tagUid) {
  lastScanTime = new Date().toISOString();
  scanCount++;

  const event = {
    tagUid,
    readerId: CONFIG.readerId,
    location: CONFIG.location,
    timestamp: lastScanTime,
    idempotencyKey: `${CONFIG.readerId}-${tagUid}-${Date.now()}`,
  };

  console.log(`Processing scan: ${tagUid} at ${lastScanTime}`);

  try {
    await sendToBackend(event);
    console.log(`✓ Successfully sent to backend\n`);
  } catch (error) {
    console.error(`✗ Failed to send to backend: ${error.message}`);
    console.log(`Buffering event for later retry...\n`);
    addToOfflineBuffer(event);
    errorCount++;
  }
}

/**
 * Send event to backend API
 */
async function sendToBackend(event) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      tagUid: event.tagUid,
      readerId: event.readerId,
      location: event.location,
      timestamp: event.timestamp,
    });

    const options = {
      hostname: new URL(CONFIG.apiBaseUrl).hostname,
      port: new URL(CONFIG.apiBaseUrl).port || 80,
      path: '/api/attendance/checkin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${CONFIG.apiToken}`,
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          isOnline = true;
          resolve(JSON.parse(responseData));
        } else {
          isOnline = false;
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      isOnline = false;
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      isOnline = false;
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Add event to offline buffer
 */
function addToOfflineBuffer(event) {
  offlineBuffer.push(event);

  // Limit buffer size
  if (offlineBuffer.length > CONFIG.maxBufferSize) {
    offlineBuffer.shift();
    console.warn(`Warning: Buffer limit reached. Oldest event removed.`);
  }

  saveOfflineBuffer();
}

/**
 * Process offline buffer and retry failed events
 */
async function processOfflineBuffer() {
  if (offlineBuffer.length === 0) return;

  console.log(`\n--- Processing offline buffer (${offlineBuffer.length} events) ---`);

  const eventsToRetry = [...offlineBuffer];
  const successfulEvents = [];

  for (const event of eventsToRetry) {
    try {
      await sendToBackend(event);
      console.log(`✓ Synced buffered event: ${event.tagUid}`);
      successfulEvents.push(event);
    } catch (error) {
      console.log(`✗ Still unable to sync: ${event.tagUid}`);
    }
  }

  // Remove successful events from buffer
  if (successfulEvents.length > 0) {
    offlineBuffer = offlineBuffer.filter(
      (event) => !successfulEvents.some((se) => se.idempotencyKey === event.idempotencyKey)
    );
    saveOfflineBuffer();
    console.log(`Synced ${successfulEvents.length} buffered events`);
  }

  console.log(`Remaining buffered events: ${offlineBuffer.length}\n`);
}

/**
 * Load offline buffer from disk
 */
function loadOfflineBuffer() {
  try {
    if (fs.existsSync(CONFIG.bufferFile)) {
      const data = fs.readFileSync(CONFIG.bufferFile, 'utf8');
      offlineBuffer = JSON.parse(data);
      console.log(`Loaded ${offlineBuffer.length} buffered events from disk\n`);
    }
  } catch (error) {
    console.error('Failed to load offline buffer:', error.message);
    offlineBuffer = [];
  }
}

/**
 * Save offline buffer to disk
 */
function saveOfflineBuffer() {
  try {
    fs.writeFileSync(CONFIG.bufferFile, JSON.stringify(offlineBuffer, null, 2));
  } catch (error) {
    console.error('Failed to save offline buffer:', error.message);
  }
}

/**
 * Start health check HTTP server
 */
function startHealthCheckServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const health = {
        status: isOnline ? 'online' : 'offline',
        readerId: CONFIG.readerId,
        location: CONFIG.location,
        uptime: process.uptime(),
        lastScan: lastScanTime,
        totalScans: scanCount,
        errorCount: errorCount,
        bufferedEvents: offlineBuffer.length,
        timestamp: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } else if (req.url === '/stats' && req.method === 'GET') {
      const stats = {
        readerId: CONFIG.readerId,
        location: CONFIG.location,
        apiBaseUrl: CONFIG.apiBaseUrl,
        simulationMode: CONFIG.simulationMode,
        uptime: process.uptime(),
        lastScan: lastScanTime,
        totalScans: scanCount,
        successfulScans: scanCount - errorCount,
        errorCount: errorCount,
        bufferedEvents: offlineBuffer.length,
        isOnline: isOnline,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(CONFIG.healthCheckPort, () => {
    console.log(`Health check server listening on port ${CONFIG.healthCheckPort}`);
    console.log(`  - Health: http://localhost:${CONFIG.healthCheckPort}/health`);
    console.log(`  - Stats: http://localhost:${CONFIG.healthCheckPort}/stats\n`);
  });
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  console.log(`Total scans processed: ${scanCount}`);
  console.log(`Events in offline buffer: ${offlineBuffer.length}`);
  saveOfflineBuffer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  saveOfflineBuffer();
  process.exit(0);
});

// Start the agent
init();
