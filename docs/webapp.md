# Leasing Chat Web Application Documentation

## Overview

The Leasing Chat web application is a React-based frontend that provides an intuitive chat interface for prospective tenants to interact with the AI-powered leasing assistant. Built with modern React patterns and TypeScript, it offers real-time conversation capabilities with intelligent action buttons and responsive design.

## Architecture

### Tech Stack

- **Framework**: React 19.1 with TypeScript
- **Build Tool**: Vite 7.1
- **Styling**: CSS with modern features
- **Icons**: Lucide React
- **Markdown**: React Markdown with GitHub Flavored Markdown
- **Development**: ESLint with TypeScript rules

### Project Structure

```
src/
├── components/          # React components
│   ├── ActionButtons.tsx    # Tour booking and action buttons
│   ├── Chat.tsx            # Main chat interface
│   ├── ChatInput.tsx       # Message input component
│   └── ChatMessage.tsx     # Individual message display
├── services/           # API integration
│   └── api.ts             # API service layer
├── types/              # TypeScript type definitions
│   └── chat.ts            # Chat-related interfaces
├── App.tsx             # Root application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

---

## Component Architecture

### 1. Chat Component (`Chat.tsx`)

The main chat interface that orchestrates the entire conversation experience.

#### Key Features
- **State Management**: Manages conversation history, loading states, and errors
- **API Integration**: Handles message sending and response processing
- **Auto-scrolling**: Automatically scrolls to newest messages
- **Error Handling**: Displays user-friendly error messages with request IDs
- **Action Processing**: Interprets AI responses and shows appropriate action buttons

#### State Structure
```typescript
interface ConversationState {
  messages: ChatMessage[];
  lead: Lead;
  preferences: Preferences;
  community_id: string;
}
```

#### Core Methods
- `handleSendMessage()`: Processes user input and calls API
- `handleConfirmTour()`: Books tour appointments
- `handleHandoffHuman()`: Initiates human agent handoff
- `handleSuggestDifferentTime()`: Requests alternative tour times

### 2. ChatMessage Component (`ChatMessage.tsx`)

Displays individual messages with proper formatting and timestamps.

#### Features
- **Message Types**: Distinguishes between user and assistant messages
- **Markdown Support**: Renders markdown content in assistant responses
- **Timestamp Display**: Shows when each message was sent
- **Responsive Design**: Adapts to different screen sizes

### 3. ChatInput Component (`ChatInput.tsx`)

Provides the message input interface with enhanced UX features.

#### Features
- **Auto-resize**: Textarea expands as user types
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Placeholder Guidance**: Suggests what users can ask about
- **Send Button**: Visual send button with disabled states
- **Input Validation**: Prevents sending empty messages

#### Example Usage
```typescript
<ChatInput 
  onSendMessage={handleSendMessage} 
  disabled={isLoading}
/>
```

### 4. ActionButtons Component (`ActionButtons.tsx`)

Dynamic action buttons that appear based on AI agent responses.

#### Button Types

**Tour Booking Buttons**
- Displays available tour times as individual buttons
- Formats dates and times in user-friendly format
- Handles tour confirmation
- Provides "Suggest Different Time" option

**Human Handoff Button**
- Connects users with leasing agents
- Clear call-to-action design

#### Props Interface
```typescript
interface ActionButtonsProps {
  action: 'propose_tour' | 'ask_clarification' | 'handoff_human';
  proposedTime?: string;
  availableTimes?: string[];
  onConfirmTour?: (time?: string) => void;
  onHandoffHuman?: () => void;
  onSuggestDifferentTime?: () => void;
}
```

---

## API Integration

### API Service (`api.ts`)

Centralized service layer for all API communications.

#### Key Features
- **Error Handling**: Comprehensive error handling with custom error types
- **Request Tracking**: Captures and displays request IDs for debugging
- **Type Safety**: Full TypeScript integration with API contracts
- **Environment Configuration**: Configurable API base URL

#### Available Methods

**Core Chat API**
```typescript
apiService.sendMessage(request: ChatRequest): Promise<ChatResponse>
```

**Tour Booking API**
```typescript
apiService.bookTour(bookingData): Promise<BookingResponse>
apiService.getBookings(community_id?, limit?, offset?): Promise<BookingsResponse>
apiService.getBooking(booking_id): Promise<BookingResponse>
apiService.cancelBooking(booking_id): Promise<CancelResponse>
```

**Health Check**
```typescript
apiService.healthCheck(): Promise<HealthResponse>
```

#### Error Handling
```typescript
interface APIError extends Error {
  status: number;
  requestId?: string;
}
```

---

## Type Definitions

### Core Types (`types/chat.ts`)

#### Lead Information
```typescript
interface Lead {
  name: string;
  email: string;
}
```

#### User Preferences
```typescript
interface Preferences {
  bedrooms?: number;
  move_in?: string;
}
```

#### Chat Messages
```typescript
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

#### API Request/Response
```typescript
interface ChatRequest {
  lead: Lead;
  message: string;
  preferences: Preferences;
  community_id: string;
}

interface ChatResponse {
  reply: string;
  action: 'propose_tour' | 'ask_clarification' | 'handoff_human';
  proposed_time?: string;
  available_times?: string[];
}
```

---

## Styling and UI/UX

### Design Principles
- **Clean Interface**: Minimal, chat-focused design
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Accessibility**: Semantic HTML and ARIA labels
- **Loading States**: Clear indicators for async operations
- **Error Feedback**: User-friendly error messages

### CSS Architecture
- **Component-scoped Styles**: Each component has associated styles
- **CSS Custom Properties**: For consistent theming
- **Flexbox Layout**: For responsive positioning
- **Smooth Animations**: Loading spinners and transitions

### Key UI Elements
- **Chat Bubbles**: Distinct styling for user vs assistant messages
- **Action Buttons**: Prominent, easy-to-tap tour booking buttons
- **Loading Indicators**: Spinning icon with "typing" message
- **Error Displays**: Alert-style error messages with request IDs

---

## User Flow

### 1. Initial Load
1. Application loads with welcome message from assistant
2. User sees input field with helpful placeholder text
3. Community context is pre-set (Sunset Ridge)

### 2. Conversation Flow
1. User types a message about apartments, pricing, or tours
2. Message appears in chat immediately
3. Loading indicator shows while API processes request
4. Assistant response appears with appropriate action buttons

### 3. Tour Booking Flow
1. User expresses interest in viewing property
2. Assistant checks available tour slots via API
3. Available times display as clickable buttons
4. User selects preferred time
5. System books tour and shows confirmation with booking ID

### 4. Error Handling Flow
1. If API error occurs, user sees friendly error message
2. Request ID displayed for support purposes
3. User can retry or continue conversation

---

## Configuration

### Environment Variables

#### Required
```bash
VITE_API_URL=http://localhost:3001  # API base URL
```

#### Development vs Production
```bash
# Development
VITE_API_URL=http://localhost:3001

# Production
VITE_API_URL=https://api.yourdomain.com
```

### Vite Configuration

The application uses Vite for development and building:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
```

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Application available at http://localhost:5173
```

### Building for Production
```bash
# Build application
npm run build

# Preview production build
npm run preview
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

---

## Testing Strategy

### Recommended Testing Approach

#### Unit Testing
- Test individual components in isolation
- Mock API service for reliable tests
- Test user interactions and state changes

#### Integration Testing
- Test component communication
- Test API integration flows
- Test error handling scenarios

#### Example Test Structure
```typescript
// Chat.test.tsx
describe('Chat Component', () => {
  it('sends message when user submits', () => {
    // Test implementation
  });
  
  it('displays loading state during API call', () => {
    // Test implementation
  });
  
  it('shows action buttons for tour proposals', () => {
    // Test implementation
  });
});
```

---

## Performance Considerations

### Optimization Strategies
- **Code Splitting**: Lazy load components when needed
- **Memoization**: Use React.memo for expensive components
- **Virtual Scrolling**: For very long conversation histories
- **Image Optimization**: Compress and optimize any images

### Bundle Size Management
- Tree shaking enabled via Vite
- Import only needed Lucide icons
- Minimize external dependencies

### Network Optimization
- API request caching where appropriate
- Debounce user input if implementing typing indicators
- Retry logic for failed requests

---

## Accessibility

### WCAG Compliance Features
- **Semantic HTML**: Proper heading structure and landmarks
- **ARIA Labels**: Descriptive labels for interactive elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Meaningful alt text and descriptions
- **Color Contrast**: Sufficient contrast ratios

### Implementation Examples
```tsx
// Accessible button example
<button 
  onClick={handleSend}
  disabled={!message.trim() || disabled}
  className="send-button"
  aria-label="Send message"
>
  <Send size={20} />
</button>
```

---

## Deployment

### Docker Support

The application includes a Dockerfile for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### Build Output
- Optimized production build in `dist/` directory
- Static assets with cache-friendly filenames
- Compressed JavaScript and CSS bundles

### Deployment Targets
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: CloudFront, CloudFlare
- **Container**: Docker with nginx
- **Traditional**: Apache/nginx serving static files

---

## Browser Support

### Supported Browsers
- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

### Polyfills
Modern browsers only - no IE support required for this application.

---

## Future Enhancements

### Planned Features
1. **Conversation History**: Persist conversations across sessions
2. **File Uploads**: Allow users to upload documents
3. **Rich Media**: Support for images and videos in chat
4. **Notifications**: Browser notifications for responses
5. **Multi-language**: Internationalization support
6. **Themes**: Dark/light mode toggle
7. **Voice Input**: Speech-to-text capabilities

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live chat
2. **Offline Support**: Service worker for offline functionality
3. **Performance Monitoring**: Real user monitoring integration
4. **A/B Testing**: Component-level testing framework
