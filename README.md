# Mini Leasing Assistant

A full-stack AI-powered leasing assistant that helps prospective renters find information about available units, pricing, pet policies, and schedule tours. Built with React, TypeScript, Express.js, PostgreSQL, and OpenAI's GPT-4.

## 🏗️ Architecture Overview

### System Design

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐    Function     ┌─────────────────┐
│                 │   ──────────>   │                 │    Calls        │                 │
│  React Frontend │                 │  Express API    │   ──────────>   │   OpenAI GPT-4  │
│                 │   <──────────    │                 │   <──────────   │                 │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
         │                                   │                                    │
         │                                   │                                    │
         │                                   ▼                                    │
         │                          ┌─────────────────┐                          │
         │                          │                 │                          │
         │                          │ Domain Tools    │                          │
         │                          │  - Availability │                          │
         │                          │  - Pet Policy   │ ◄────────────────────────┘
         │                          │  - Pricing      │
         │                          │  - Tour Slots   │
         │                          └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│                 │                 │                 │
│   Web Browser   │                 │  PostgreSQL DB  │
│                 │                 │                 │
└─────────────────┘                 └─────────────────┘
```

### Component Breakdown

1. **Frontend (React/TypeScript)**: Modern chat UI with message history, action buttons, and real-time communication
2. **Backend API (Express/TypeScript)**: RESTful API with `/api/reply` endpoint for chat processing
3. **LLM Agent**: OpenAI GPT-4 integration with function calling for tool orchestration
4. **Domain Tools**: Three core tools for checking availability, pet policies, and pricing
5. **Database (PostgreSQL)**: Production-ready database with connection pooling and ACID compliance
6. **Logging & Observability**: Winston logging with request tracking and LLM metrics

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key

### 1. Clone and Setup

```bash
git clone <repository-url>
cd leasing-assistant
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (defaults shown)
NODE_ENV=development
PORT=3001
```

### 3. Start the Application

```bash
# Start all services (PostgreSQL, API, Web)
docker-compose up --build
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Database**: localhost:5432

### 4. Test the Application

1. Open your browser to `http://localhost:5173`
2. Try asking questions like:
   - "Do you have any 2-bedroom units available?"
   - "What's your pet policy for cats?"
   - "How much does unit 12B cost?"
   - "Can I schedule a tour?"

## 🧪 Running Tests

```bash
cd api
npm test
```

The test suite includes unit tests for:
- ✅ Availability checking (success and no results scenarios)
- ✅ Pet policy lookup (found and not found cases)
- ✅ Pricing information retrieval
- ✅ Database error handling

## 🛠️ Implementation Details

### Agent Logic & Tool Orchestration

The LLM agent uses OpenAI's function calling to decide which domain tools to invoke:

```typescript
// Available functions for the agent
const functions = [
  {
    name: 'check_availability',
    description: 'Check available units in a community',
    parameters: { community_id: string, bedrooms?: number }
  },
  {
    name: 'check_pet_policy', 
    description: 'Check pet policy for specific pet type',
    parameters: { community_id: string, pet_type: string }
  },
  {
    name: 'get_pricing',
    description: 'Get pricing for a specific unit',
    parameters: { community_id: string, unit_id: string }
  }
]
```

### Action System

The agent returns one of three actions based on the conversation context:

| Action | When Used | Frontend Behavior |
|--------|-----------|-------------------|
| `propose_tour` | Has enough info to suggest specific tour time | Shows "Confirm Tour" button with proposed time |
| `ask_clarification` | Needs more information from the user | Continues conversation naturally |
| `handoff_human` | Can't fulfill request automatically | Shows "Connect with Agent" button |

### Database Schema

**Key Tables:**
- `communities`: Community information (name, contact info)
- `units`: Available units with bedroom/bathroom counts, square footage
- `pet_policies`: Pet rules by community and pet type
- `pricing`: Rent, deposits, fees, and special offers
- `tour_slots`: Available tour time slots
- `logs`: Request tracking and LLM metrics

### Error Handling & Observability

- **Request IDs**: Every API call gets a unique ID for tracking
- **Comprehensive Logging**: Tool calls, LLM latency, token usage
- **Graceful Degradation**: Fallback responses when tools fail
- **Frontend Error States**: Clear error messages with request IDs

## 📊 Sample Data

The system comes pre-loaded with realistic sample data for "Sunset Ridge" community:

- **3 units**: 2-bedroom and 3-bedroom options
- **Pet policies**: Cats ($50), Dogs ($100), Birds ($25)
- **Pricing**: $2,395-$3,200/month with first month free special
- **Tour slots**: Multiple time slots over next 3 days

## 🎯 Key Features Implemented

### ✅ Core Requirements Met

- **LLM Agent**: OpenAI GPT-4 with function calling
- **Three Domain Tools**: Availability, pet policy, pricing
- **Tool Orchestration**: Automatic decision making and chaining
- **Action System**: propose_tour, ask_clarification, handoff_human
- **Full-Stack**: React frontend + Express backend
- **Database**: PostgreSQL with connection pooling and ACID compliance
- **Tests**: 10+ unit tests covering main scenarios
- **Observability**: Request IDs, logging, LLM metrics

### 🎨 Additional Polish

- **Beautiful UI**: Modern chat interface with animations
- **Responsive Design**: Works on mobile and desktop
- **Real-time Features**: Loading indicators, typing states
- **Error Handling**: Network failures, API errors, request tracking
- **Docker Setup**: Complete containerized development environment
- **Production Database**: PostgreSQL with proper connection management

## 🔄 Trade-offs & Design Decisions

### Technology Choices

**React + TypeScript Frontend**
- ✅ Modern, type-safe development
- ✅ Excellent developer experience
- ⚠️ Could use server-side rendering for SEO

**Express.js Backend**
- ✅ Simple, well-understood framework
- ✅ Great for rapid prototyping
- ⚠️ Could benefit from more structure (NestJS) for larger apps

**PostgreSQL Database**
- ✅ Production-ready with ACID compliance
- ✅ Connection pooling for better performance
- ✅ Advanced data types and JSON support
- ✅ Better backup and recovery options

**OpenAI Function Calling**
- ✅ Reliable tool orchestration
- ✅ Natural language understanding
- ⚠️ Dependent on external service
- ⚠️ Cost considerations for high volume

### Architecture Decisions

**Monolithic Function Calling vs. Multi-Agent**
- ✅ Chose monolithic for simplicity
- ⚠️ Could implement orchestrator + specialized agents for complex workflows

**Real-time vs. Request-Response**
- ✅ Chose request-response for reliability
- ⚠️ Could add WebSocket streaming for better UX

**In-Memory vs. Persistent Sessions**
- ✅ Frontend state management for demo
- ⚠️ Should persist conversation history in production

## 🚀 What I'd Do Next (2-4 Hours More)

### Immediate Improvements
1. **Conversation Memory**: Persist chat history across sessions
2. **Streaming Responses**: WebSocket integration for real-time typing
3. **Advanced Tool Chaining**: Multi-step workflows (availability → pricing → tour)
4. **Session Management**: User authentication and conversation tracking

### Production Readiness
1. **Caching Layer**: Redis for frequent queries
2. **Rate Limiting**: Protect against abuse
3. **Input Validation**: Schema validation with Zod
4. **Health Checks**: Database and external service monitoring
5. **Deployment**: Cloud deployment with proper environment management

### Enhanced Features
1. **Multi-Community Support**: Property management company scale
2. **Calendar Integration**: Real tour booking with calendar sync
3. **Email/SMS Integration**: Automated follow-ups
4. **Analytics Dashboard**: Conversation insights and performance metrics
5. **A/B Testing**: Optimize agent prompts and flows

## 🏆 Success Metrics

This implementation demonstrates:

- **Clean Architecture**: Separation of concerns, modular design
- **Production Patterns**: Error handling, logging, environment configuration
- **AI Integration**: Proper prompt engineering and function calling
- **Full-Stack Skills**: End-to-end implementation with modern tools
- **Testing Mindset**: Unit tests covering critical paths
- **Database Migration**: Successfully migrated from SQLite to PostgreSQL
- **Documentation**: Clear setup and explanation of trade-offs

The system is **immediately runnable**, well-tested, and designed for easy extension during the live follow-up session.

## 📚 Additional Documentation

- [PostgreSQL Migration Guide](docs/postgresql-migration.md) - Detailed migration documentation
- [API Documentation](docs/spec.md) - API specifications and endpoints
