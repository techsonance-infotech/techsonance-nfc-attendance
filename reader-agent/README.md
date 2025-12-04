# NFC Reader Agent

A standalone Node.js agent for USB/Ethernet NFC readers that communicates with the NFC Attendance System backend API.

## Features

- ✅ **Offline Buffering**: Automatically buffers attendance events when offline and syncs when connection returns
- ✅ **Health Monitoring**: Built-in HTTP server for health checks and statistics
- ✅ **Configurable**: Easy configuration via environment variables
- ✅ **Simulation Mode**: Test without physical hardware
- ✅ **Automatic Retry**: Failed events are automatically retried
- ✅ **Multiple Reader Support**: Can run multiple agents for different locations

## Requirements

- Node.js 14.0.0 or higher
- Network access to the backend API
- (Optional) USB/Ethernet NFC reader hardware

## Installation

```bash
cd reader-agent
npm install
```

## Configuration

Create a `.env` file in the `reader-agent` directory:

```env
# Backend API Configuration
API_BASE_URL=http://localhost:3000
API_TOKEN=your_jwt_bearer_token_here

# Reader Configuration
READER_ID=MAIN_GATE
READER_LOCATION=Main Entrance

# Health Check Configuration
HEALTH_CHECK_PORT=8080

# Simulation Mode (for testing without hardware)
SIMULATION_MODE=true
```

## Usage

### Simulation Mode (Testing)

Run without physical hardware for testing:

```bash
npm run dev
```

or

```bash
SIMULATION_MODE=true npm start
```

### Production Mode

Run with actual NFC reader hardware:

```bash
npm start
```

**Note**: For production use with real hardware, you'll need to:
1. Install appropriate NFC reader libraries (e.g., `nfc-pcsc`, `nfc`, or `serialport`)
2. Modify `index.js` to integrate with your specific reader hardware
3. Set `SIMULATION_MODE=false`

## Hardware Integration

The agent supports various NFC reader types. You'll need to install the appropriate library:

### PC/SC Readers (USB)
```bash
npm install nfc-pcsc
```

### libnfc Readers
```bash
npm install nfc
```

### Serial Readers
```bash
npm install serialport
```

Then modify the `index.js` file to integrate with your reader library.

## Health Check Endpoints

The agent exposes two HTTP endpoints for monitoring:

### Health Check
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "online",
  "readerId": "MAIN_GATE",
  "location": "Main Entrance",
  "uptime": 1234.56,
  "lastScan": "2024-12-04T10:30:45.123Z",
  "totalScans": 150,
  "errorCount": 2,
  "bufferedEvents": 0,
  "timestamp": "2024-12-04T10:35:00.000Z"
}
```

### Statistics
```bash
curl http://localhost:8080/stats
```

Response:
```json
{
  "readerId": "MAIN_GATE",
  "location": "Main Entrance",
  "apiBaseUrl": "http://localhost:3000",
  "simulationMode": true,
  "uptime": 1234.56,
  "lastScan": "2024-12-04T10:30:45.123Z",
  "totalScans": 150,
  "successfulScans": 148,
  "errorCount": 2,
  "bufferedEvents": 0,
  "isOnline": true,
  "memory": { ... },
  "timestamp": "2024-12-04T10:35:00.000Z"
}
```

## Offline Buffering

When the agent loses connection to the backend:
- Events are automatically saved to `offline-buffer.json`
- The agent retries every 30 seconds
- Buffer is limited to 1000 events (oldest are removed first)
- All buffered events are synced when connection returns

## Running Multiple Agents

You can run multiple agents for different readers/locations:

```bash
# Terminal 1 - Main Gate
READER_ID=MAIN_GATE READER_LOCATION="Main Entrance" HEALTH_CHECK_PORT=8080 npm start

# Terminal 2 - Floor 2
READER_ID=FLOOR_2 READER_LOCATION="Building A - Floor 2" HEALTH_CHECK_PORT=8081 npm start

# Terminal 3 - Parking
READER_ID=PARKING READER_LOCATION="Parking Entrance" HEALTH_CHECK_PORT=8082 npm start
```

## Process Management

For production deployment, use a process manager:

### Using PM2
```bash
npm install -g pm2

# Start agent
pm2 start index.js --name nfc-reader-main-gate

# View logs
pm2 logs nfc-reader-main-gate

# Restart
pm2 restart nfc-reader-main-gate

# Stop
pm2 stop nfc-reader-main-gate
```

### Using systemd (Linux)

Create `/etc/systemd/system/nfc-reader.service`:

```ini
[Unit]
Description=NFC Reader Agent
After=network.target

[Service]
Type=simple
User=nfc-reader
WorkingDirectory=/opt/nfc-reader-agent
Environment="API_BASE_URL=http://localhost:3000"
Environment="API_TOKEN=your_token"
Environment="READER_ID=MAIN_GATE"
Environment="READER_LOCATION=Main Entrance"
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable nfc-reader
sudo systemctl start nfc-reader
sudo systemctl status nfc-reader
```

## Troubleshooting

### Agent can't connect to backend
- Check `API_BASE_URL` is correct
- Verify network connectivity
- Ensure firewall allows outbound connections
- Check if backend server is running

### Events not being recorded
- Verify `API_TOKEN` is valid (check bearer token in localStorage on frontend)
- Check reader heartbeat in admin dashboard
- Review agent logs for errors
- Test health endpoint: `curl http://localhost:8080/health`

### Reader hardware not detected
- Ensure hardware is properly connected
- Check USB permissions (may need udev rules on Linux)
- Verify correct reader library is installed
- Test reader independently before integrating

## Monitoring

Monitor your readers from the admin dashboard:
1. Go to `/dashboard/readers`
2. View reader status (online/offline)
3. Check last heartbeat time
4. Monitor reader locations

## Security Best Practices

1. **Secure API Tokens**: Store tokens securely, never commit to version control
2. **Use HTTPS**: In production, always use HTTPS for API communication
3. **Network Segmentation**: Run readers on isolated network segment
4. **Regular Updates**: Keep Node.js and dependencies up to date
5. **Access Control**: Limit physical access to reader devices
6. **Logging**: Enable comprehensive logging for audit trails

## Support

For issues or questions:
- Check the main project README
- Review API documentation
- Contact system administrator

## License

MIT
