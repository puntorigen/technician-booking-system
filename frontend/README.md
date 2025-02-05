# Frontend Application

A modern React application built with Vite and Material UI for managing technician bookings with a chat-based interface.

## Architecture

### Core Components

The application is split into several modular components for better maintainability:

- **App Component** (`App.jsx`): Main application container and state management
- **ChatWindow** (`components/ChatWindow.jsx`): Handles the chat display and message rendering
- **ChatMessage** (`components/ChatMessage.jsx`): Individual message component
- **ChatInput** (`components/ChatInput.jsx`): Message input form with send button
- **BookingList** (`components/BookingList.jsx`): Displays the list of bookings
- **BookingDialog** (`components/BookingDialog.jsx`): Modal for viewing and managing bookings
- **Theme** (`theme/theme.js`): Custom Material UI theme configuration

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
│   ├── components/     # React components
│   │   ├── ChatWindow.jsx
│   │   ├── ChatMessage.jsx
│   │   ├── ChatInput.jsx
│   │   ├── BookingList.jsx
│   │   └── BookingDialog.jsx
│   ├── theme/         # Theme configuration
│   │   └── theme.js
│   ├── App.jsx        # Main application component
│   ├── main.jsx       # Application entry point
│   └── assets/        # Static assets
├── public/            # Public assets
├── index.html         # HTML template
└── package.json       # Dependencies and scripts
```

## Technologies Used

- **React 18+**: Modern React with hooks
- **Vite**: Next-generation frontend tooling
- **Material UI**: React component library
- **Axios**: HTTP client for API requests

## Component Details

### ChatWindow
- Displays chat messages
- Handles message scrolling
- Shows loading states
- Fixed height container with overflow

### ChatMessage
- Renders individual messages
- Different styles for user/system messages
- Paper component with custom styling

### ChatInput
- Message input form
- Send button with loading state
- Form validation

### BookingList
- Displays bookings in a sorted list
- Shows booking details
- Empty state handling

### BookingDialog
- Modal for viewing bookings
- Delete functionality
- Responsive design

## API Integration

The frontend communicates with the backend through:
- `http://localhost:8000` API endpoint
- Axios for HTTP requests
- Real-time updates on booking changes
