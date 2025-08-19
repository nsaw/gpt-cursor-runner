# ***REMOVED*** Telemetry API Documentation

**Version**: 8.12.00  
**Phase**: P8.12.00  
**Last Updated**: 2025-07-28  
**Base URL**: `http://localhost:5051`

## Overview

The ***REMOVED*** Telemetry API provides comprehensive access to telemetry data, metrics, alerts, and system health information for all ***REMOVED*** components. This REST API serves as the central data access layer for the telemetry dashboard and external monitoring systems.

## Authentication

Currently, the API operates without authentication in development mode. For production deployments, API key authentication will be required.

### Headers

```
Content-Type: application/json
Accept: application/json
```

## Base Endpoints

### Health Check

**GET** `/api/telemetry/health`

Returns the overall health status of the telemetry system.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-07-28T17:59:00.000Z",
  "version": "8.12.00",
  "components": {
    "dashboard": "healthy",
    "api": "healthy",
    "orchestrator": "healthy",
    "metrics": "healthy",
    "alerts": "healthy"
  },
  "uptime": 3600
}
```

### System Information

**GET** `/api/telemetry/info`

Returns system information and configuration details.

**Response:**

```json
{
  "system": {
    "environment": "development",
    "version": "8.12.00",
    "startTime": "2025-07-28T17:00:00.000Z",
    "uptime": 3600
  },
  "configuration": {
    "dashboard": {
      "port": 5050,
      "host": "localhost",
      "refreshInterval": 5000
    },
    "api": {
      "port": 5051,
      "host": "localhost",
      "corsEnabled": true,
      "rateLimit": 100
    }
  }
}
```

## Telemetry Data Endpoints

### Get All Telemetry Data

**GET** `/api/telemetry/data`

Returns aggregated telemetry data from all components.

**Query Parameters:**

- `component` (optional): Filter by specific component
- `startTime` (optional): Start time in ISO format
- `endTime` (optional): End time in ISO format
- `limit` (optional): Maximum number of records (default: 100)

**Response:**

```json
{
  "data": [
    {
      "component": "dashboard",
      "timestamp": "2025-07-28T17:59:00.000Z",
      "metrics": {
        "cpu": 45.2,
        "memory": 67.8,
        "requests": 1250
      },
      "status": "healthy"
    }
  ],
  "total": 1,
  "limit": 100
}
```

### Get Component Telemetry

**GET** `/api/telemetry/data/{component}`

Returns telemetry data for a specific component.

**Path Parameters:**

- `component`: Component name (dashboard, api, orchestrator, metrics, alerts)

**Response:**

```json
{
  "component": "dashboard",
  "data": [
    {
      "timestamp": "2025-07-28T17:59:00.000Z",
      "metrics": {
        "cpu": 45.2,
        "memory": 67.8,
        "requests": 1250
      },
      "status": "healthy"
    }
  ],
  "total": 1
}
```

## Metrics Endpoints

### Get Aggregated Metrics

**GET** `/api/telemetry/metrics`

Returns aggregated metrics across all components.

**Query Parameters:**

- `interval` (optional): Aggregation interval in seconds (default: 60)
- `startTime` (optional): Start time in ISO format
- `endTime` (optional): End time in ISO format

**Response:**

```json
{
  "metrics": {
    "cpu": {
      "average": 42.5,
      "min": 35.2,
      "max": 67.8,
      "count": 100
    },
    "memory": {
      "average": 65.3,
      "min": 58.1,
      "max": 72.4,
      "count": 100
    },
    "requests": {
      "total": 125000,
      "average": 1250,
      "min": 980,
      "max": 1520,
      "count": 100
    }
  },
  "interval": 60,
  "startTime": "2025-07-28T17:00:00.000Z",
  "endTime": "2025-07-28T17:59:00.000Z"
}
```

### Get Component Metrics

**GET** `/api/telemetry/metrics/{component}`

Returns metrics for a specific component.

**Response:**

```json
{
  "component": "dashboard",
  "metrics": {
    "cpu": {
      "average": 45.2,
      "min": 38.5,
      "max": 67.8,
      "count": 100
    },
    "memory": {
      "average": 67.8,
      "min": 62.1,
      "max": 75.3,
      "count": 100
    }
  },
  "interval": 60
}
```

## Alert Endpoints

### Get All Alerts

**GET** `/api/telemetry/alerts`

Returns all active and recent alerts.

**Query Parameters:**

- `severity` (optional): Filter by severity level (info, warning, error, critical)
- `status` (optional): Filter by status (active, resolved)
- `limit` (optional): Maximum number of alerts (default: 50)

**Response:**

```json
{
  "alerts": [
    {
      "id": "alert-001",
      "component": "dashboard",
      "severity": "warning",
      "message": "High CPU usage detected",
      "timestamp": "2025-07-28T17:55:00.000Z",
      "status": "active",
      "value": 85.2,
      "threshold": 80.0
    }
  ],
  "total": 1,
  "active": 1,
  "resolved": 0
}
```

### Get Component Alerts

**GET** `/api/telemetry/alerts/{component}`

Returns alerts for a specific component.

**Response:**

```json
{
  "component": "dashboard",
  "alerts": [
    {
      "id": "alert-001",
      "severity": "warning",
      "message": "High CPU usage detected",
      "timestamp": "2025-07-28T17:55:00.000Z",
      "status": "active",
      "value": 85.2,
      "threshold": 80.0
    }
  ],
  "total": 1
}
```

### Create Alert

**POST** `/api/telemetry/alerts`

Creates a new alert.

**Request Body:**

```json
{
  "component": "dashboard",
  "severity": "warning",
  "message": "High CPU usage detected",
  "value": 85.2,
  "threshold": 80.0
}
```

**Response:**

```json
{
  "id": "alert-002",
  "component": "dashboard",
  "severity": "warning",
  "message": "High CPU usage detected",
  "timestamp": "2025-07-28T17:59:00.000Z",
  "status": "active",
  "value": 85.2,
  "threshold": 80.0
}
```

## Event Endpoints

### Submit Event

**POST** `/api/telemetry/event`

Submits a telemetry event.

**Request Body:**

```json
{
  "component": "dashboard",
  "eventType": "user_action",
  "data": {
    "action": "refresh_dashboard",
    "userId": "user-123",
    "timestamp": "2025-07-28T17:59:00.000Z"
  }
}
```

**Response:**

```json
{
  "id": "event-001",
  "component": "dashboard",
  "eventType": "user_action",
  "timestamp": "2025-07-28T17:59:00.000Z",
  "status": "recorded"
}
```

### Get Events

**GET** `/api/telemetry/events`

Returns telemetry events.

**Query Parameters:**

- `component` (optional): Filter by component
- `eventType` (optional): Filter by event type
- `startTime` (optional): Start time in ISO format
- `endTime` (optional): End time in ISO format
- `limit` (optional): Maximum number of events (default: 100)

**Response:**

```json
{
  "events": [
    {
      "id": "event-001",
      "component": "dashboard",
      "eventType": "user_action",
      "timestamp": "2025-07-28T17:59:00.000Z",
      "data": {
        "action": "refresh_dashboard",
        "userId": "user-123"
      }
    }
  ],
  "total": 1,
  "limit": 100
}
```

## Configuration Endpoints

### Get Configuration

**GET** `/api/telemetry/config`

Returns current telemetry configuration.

**Response:**

```json
{
  "telemetry": {
    "dashboard": {
      "port": 5050,
      "host": "localhost",
      "refreshInterval": 5000,
      "maxDataPoints": 1000
    },
    "api": {
      "port": 5051,
      "host": "localhost",
      "corsEnabled": true,
      "rateLimit": 100
    }
  },
  "environment": "development",
  "version": "8.12.00"
}
```

### Update Configuration

**PUT** `/api/telemetry/config`

Updates telemetry configuration.

**Request Body:**

```json
{
  "telemetry": {
    "dashboard": {
      "refreshInterval": 3000
    }
  }
}
```

**Response:**

```json
{
  "status": "updated",
  "changes": ["telemetry.dashboard.refreshInterval"],
  "timestamp": "2025-07-28T17:59:00.000Z"
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid parameter value",
    "details": {
      "parameter": "limit",
      "value": -1,
      "constraint": "must be positive"
    }
  },
  "timestamp": "2025-07-28T17:59:00.000Z"
}
```

### Common Error Codes

- `400` - Bad Request: Invalid parameters or request body
- `404` - Not Found: Resource not found
- `500` - Internal Server Error: Server error
- `503` - Service Unavailable: Service temporarily unavailable

## Rate Limiting

The API implements rate limiting to prevent abuse:

- Default limit: 100 requests per minute per IP
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## CORS Support

CORS is enabled for the following origins:

- `http://localhost:3000`
- `http://localhost:5050`

## Usage Examples

### JavaScript/Node.js

```javascript
const fetch = require("node-fetch");

// Get health status
const health = await fetch("http://localhost:5051/api/telemetry/health").then(
  (res) => res.json(),
);

// Get telemetry data
const data = await fetch(
  "http://localhost:5051/api/telemetry/data?limit=10",
).then((res) => res.json());

// Submit event
const event = await fetch("http://localhost:5051/api/telemetry/event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    component: "dashboard",
    eventType: "user_action",
    data: { action: "refresh" },
  }),
}).then((res) => res.json());
```

### cURL

```bash
# Health check
curl http://localhost:5051/api/telemetry/health

# Get telemetry data
curl "http://localhost:5051/api/telemetry/data?limit=10"

# Submit event
curl -X POST http://localhost:5051/api/telemetry/event \
  -H "Content-Type: application/json" \
  -d '{"component":"dashboard","eventType":"user_action","data":{"action":"refresh"}}'
```

### Python

```python
import requests

# Health check
health = requests.get('http://localhost:5051/api/telemetry/health').json()

# Get telemetry data
data = requests.get('http://localhost:5051/api/telemetry/data',
                   params={'limit': 10}).json()

# Submit event
event = requests.post('http://localhost:5051/api/telemetry/event',
                     json={
                         'component': 'dashboard',
                         'eventType': 'user_action',
                         'data': {'action': 'refresh'}
                     }).json()
```

## Monitoring and Logging

### Log Files

- API logs: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-api.log`
- Access logs: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-api-access.log`
- Error logs: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-api-error.log`

### Metrics

The API exposes its own metrics at `/api/telemetry/metrics/api` including:

- Request count and rate
- Response times
- Error rates
- Active connections

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the API server is running on port 5051
   - Check firewall settings
   - Verify no other service is using the port

2. **CORS Errors**
   - Ensure your origin is in the allowed origins list
   - Check that CORS is enabled in configuration

3. **Rate Limit Exceeded**
   - Reduce request frequency
   - Implement exponential backoff
   - Check rate limit headers for reset time

4. **Invalid JSON**
   - Ensure request body is valid JSON
   - Check Content-Type header is set to application/json

### Debug Mode

Enable debug logging by setting the log level to 'debug' in the configuration:

```json
{
  "telemetry": {
    "logging": {
      "level": "debug"
    }
  }
}
```

## Version History

- **8.12.00** - Initial API documentation
- **8.11.00** - Configuration management
- **8.10.00** - Core API implementation
- **8.09.00** - Orchestrator foundation

## Support

For issues and questions:

- Check the logs in `/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/`
- Review the configuration in `/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/`
- Monitor the health endpoint for system status
