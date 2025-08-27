# Leasing Assistant API Documentation

## Overview

The Leasing Assistant API is a Node.js/Express application that provides AI-powered conversational assistance for residential property leasing. It uses LangChain with OpenAI's GPT-4o-mini model to provide intelligent responses to prospective tenant inquiries.

## Architecture

### Core Components

- **Express Server**: RESTful API with CORS, security headers, and JSON middleware
- **LangChain Agent**: AI agent with specialized tools for leasing operations
- **PostgreSQL Database**: Persistent storage for communities, units, pricing, and bookings
- **Leasing Tools**: Specialized functions for availability, pricing, tours, and policies

### Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **AI/ML**: LangChain, OpenAI GPT-4o-mini
- **Database**: PostgreSQL with pg driver
- **Security**: Helmet, CORS
- **Logging**: Winston
- **Validation**: Zod
- **Language**: TypeScript

## API Endpoints

### Base URL
- **Development**: `http://localhost:3001`
- **Production**: Configure via environment variables

All API endpoints are prefixed with `/api`.

### Authentication
Currently, the API does not implement authentication. In production, consider adding API keys or OAuth.

---

## Core Endpoints

### 1. Chat Message Processing

**POST** `/api/reply`

Process a chat message through the AI agent and return an intelligent response.

#### Request Body
```json
{
  "lead": {
    "name": "string",
    "email": "string"
  },
  "message": "string",
  "preferences": {
    "bedrooms": "number (optional)",
    "move_in": "string (optional, YYYY-MM-DD format)"
  },
  "community_id": "string"
}
```

#### Response
```json
{
  "reply": "string",
  "action": "propose_tour | ask_clarification | handoff_human",
  "proposed_time": "string (optional, ISO 8601)",
  "available_times": "string[] (optional, ISO 8601)"
}
```

#### Response Headers
- `X-Request-ID`: Unique identifier for request tracking

#### Example Request
```bash
curl -X POST http://localhost:3001/api/reply \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "message": "I need a 2-bedroom apartment available in July",
    "preferences": {
      "bedrooms": 2,
      "move_in": "2025-07-01"
    },
    "community_id": "sunset-ridge"
  }'
```

#### Example Response
```json
{
  "reply": "I found several 2-bedroom units available for July! We have apartments ranging from 950-1100 sq ft. Would you like to schedule a tour to see them?",
  "action": "propose_tour",
  "available_times": [
    "2025-06-15T10:00:00.000Z",
    "2025-06-15T14:00:00.000Z",
    "2025-06-16T11:00:00.000Z"
  ]
}
```

### 2. Tour Booking

**POST** `/api/book-tour`

Book a tour slot for a prospective tenant.

#### Request Body
```json
{
  "community_id": "string",
  "slot_time": "string (ISO 8601)",
  "lead_name": "string",
  "lead_email": "string",
  "lead_phone": "string (optional)"
}
```

#### Response
```json
{
  "success": true,
  "booking_id": "string",
  "message": "string",
  "request_id": "string"
}
```

#### Example Request
```bash
curl -X POST http://localhost:3001/api/book-tour \
  -H "Content-Type: application/json" \
  -d '{
    "community_id": "sunset-ridge",
    "slot_time": "2025-06-15T10:00:00.000Z",
    "lead_name": "Jane Doe",
    "lead_email": "jane@example.com",
    "lead_phone": "555-123-4567"
  }'
```

### 3. Get Bookings

**GET** `/api/bookings`

Retrieve tour bookings with optional filtering.

#### Query Parameters
- `community_id` (optional): Filter by community
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

#### Response
```json
{
  "bookings": [
    {
      "booking_id": "string",
      "community_id": "string",
      "lead_name": "string",
      "lead_email": "string",
      "lead_phone": "string",
      "slot_time": "string (ISO 8601)",
      "status": "confirmed | cancelled | completed",
      "created_at": "string (ISO 8601)"
    }
  ],
  "total": "number",
  "request_id": "string"
}
```

### 4. Get Single Booking

**GET** `/api/bookings/:booking_id`

Retrieve details for a specific booking.

#### Path Parameters
- `booking_id`: Unique booking identifier

#### Response
```json
{
  "booking": {
    "booking_id": "string",
    "community_id": "string",
    "lead_name": "string",
    "lead_email": "string",
    "lead_phone": "string",
    "slot_time": "string (ISO 8601)",
    "status": "string",
    "notes": "string",
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  },
  "request_id": "string"
}
```

### 5. Cancel Booking

**POST** `/api/bookings/:booking_id/cancel`

Cancel an existing tour booking.

#### Path Parameters
- `booking_id`: Unique booking identifier

#### Response
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "request_id": "string"
}
```

### 6. Health Check

**GET** `/api/health`

Service health status endpoint.

#### Response
```json
{
  "status": "ok",
  "timestamp": "string (ISO 8601)",
  "service": "leasing-assistant-api"
}
```

---

## AI Agent Capabilities

The LangChain agent has access to specialized tools for leasing operations:

### Available Tools

1. **Check Availability**: Find available units by bedrooms and community
2. **Get Pricing**: Retrieve rent, fees, and special offers for units
3. **Check Pet Policy**: Get pet policies including fees and restrictions
4. **Get Tour Slots**: Find available tour times for scheduling
5. **Community Information**: Access community details and amenities

### Agent Actions

The agent can respond with three types of actions:

- **`propose_tour`**: When tour times are available and user shows interest
- **`ask_clarification`**: When more information is needed
- **`handoff_human`**: When human assistance is required

---

## Database Schema

### Core Tables

#### Communities
```sql
CREATE TABLE communities (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255)
);
```

#### Units
```sql
CREATE TABLE units (
  id VARCHAR(255) PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  sqft INTEGER,
  description TEXT,
  available BOOLEAN DEFAULT true,
  FOREIGN KEY (community_id) REFERENCES communities(id)
);
```

#### Pricing
```sql
CREATE TABLE pricing (
  id SERIAL PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  unit_id VARCHAR(255) NOT NULL,
  rent DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) NOT NULL,
  application_fee DECIMAL(10,2) DEFAULT 0,
  admin_fee DECIMAL(10,2) DEFAULT 0,
  special_offer TEXT,
  effective_date DATE DEFAULT CURRENT_DATE
);
```

#### Tour Slots & Bookings
```sql
CREATE TABLE tour_slots (
  id SERIAL PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  slot_time TIMESTAMP NOT NULL,
  available BOOLEAN DEFAULT true,
  max_capacity INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(255) UNIQUE NOT NULL,
  community_id VARCHAR(255) NOT NULL,
  tour_slot_id INTEGER NOT NULL,
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255) NOT NULL,
  lead_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3001
NODE_ENV=development|production
```

### Optional Environment Variables

```bash
# CORS Origins (production)
CORS_ORIGINS=https://your-frontend-domain.com

# Logging Level
LOG_LEVEL=info|debug|error
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "string",
  "message": "string (in development)",
  "request_id": "string (optional)"
}
```

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request (validation errors)
- **404**: Not Found
- **500**: Internal Server Error

### Common Error Scenarios

1. **Missing Required Fields**: 400 with validation message
2. **Invalid Community ID**: 400 with "Community not found"
3. **Tour Slot Unavailable**: 400 with "Tour slot not available"
4. **Database Connection Issues**: 500 with generic error message

---

## Logging and Monitoring

### Request Tracking
- All requests receive a unique `request_id`
- Request IDs are logged and returned in responses
- Failed requests log full error details

### Performance Metrics
- LLM latency tracking
- Tool execution timing
- Database query performance

### Log Structure
```json
{
  "request_id": "string",
  "timestamp": "ISO 8601",
  "tool_name": "string",
  "tool_args": "object",
  "tool_response": "object",
  "llm_latency": "number (ms)",
  "llm_tokens": {
    "prompt": "number",
    "completion": "number",
    "total": "number"
  },
  "error": "string (optional)"
}
```

---

## Rate Limiting and Security

### Current Security Measures
- Helmet.js for security headers
- CORS configuration
- Request size limits (10MB JSON)
- Input validation with proper error responses

### Recommended Production Additions
- API key authentication
- Rate limiting (express-rate-limit)
- Request/response compression
- HTTPS enforcement
- Input sanitization

---

## Development and Testing

### Running the API
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Docker Support
```bash
# Build and run with docker-compose
docker-compose up

# API will be available at http://localhost:3001
```

### Testing Endpoints
Use the provided health check endpoint to verify the API is running:
```bash
curl http://localhost:3001/api/health
```

---

## API Versioning

Currently, the API is unversioned. For production, consider implementing versioning:
- URL versioning: `/api/v1/reply`
- Header versioning: `API-Version: 1.0`
- Accept header versioning: `Accept: application/vnd.api+json;version=1`
