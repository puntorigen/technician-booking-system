# Frontend Application

A modern React application built with Vite and Material UI for managing technician bookings with a chat-based interface.

## Architecture

### Core Components

- **App Component** (`App.jsx`): Main application container
  - Chat interface
  - Booking management
  - Natural language interaction

### Key Features

1. **Chat Interface**
   - Real-time message display
   - User input handling
   - Loading states and animations
   - Automatic scrolling
   - Message history

2. **Booking Management**
   - View all bookings in a modal
   - Delete individual bookings
   - Bulk delete all bookings
   - Real-time booking list updates
   - Sorted booking display

3. **UI Components**
   - Material UI integration
   - Responsive design
   - Modal dialogs
   - Loading indicators
   - Error handling

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx         # Main application component
│   ├── main.jsx        # Application entry point
│   └── assets/         # Static assets
├── public/             # Public assets
├── index.html          # HTML template
└── package.json        # Dependencies and scripts
```

## Technologies Used

- **React 18+**: Modern React with hooks
- **Vite**: Next-generation frontend tooling
- **Material UI**: React component library
- **Axios**: HTTP client for API requests

## Features

### Chat Interface
- Real-time message updates
- Conversation history
- Loading states
- Error handling
- Auto-scrolling to latest messages

### Booking Management
- List all bookings
- Sort bookings by date
- Delete individual bookings
- Bulk delete functionality
- Real-time updates

### UI/UX
- Responsive design
- Material Design components
- Loading indicators
- Error messages
- Confirmation dialogs

## API Integration

The frontend communicates with the backend through:
- `http://localhost:8000` API endpoint
- Axios for HTTP requests
- Real-time booking updates
- Error handling and retries

## Docker Support

The application is containerized using Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
```

## Development Notes

1. **Hot Module Replacement (HMR)**
   - Automatic page updates
   - State preservation
   - Fast refresh

2. **Code Organization**
   - Component-based architecture
   - Hooks for state management
   - Utility functions

3. **Best Practices**
   - Error boundaries
   - Loading states
   - User feedback
   - Responsive design

## Testing

Run tests with:
```bash
npm run test
```

## Environment Variables

No environment variables required for frontend development. The backend URL is configured in `App.jsx`.
