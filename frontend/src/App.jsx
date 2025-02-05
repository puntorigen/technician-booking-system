import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

// Use an environment variable for API URL if available
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Define a custom MUI theme
const theme = createTheme({
  palette: {
    primary: { main: '#4285f4' },
    background: { default: '#ffffff', paper: '#f8f9fa' },
    text: { primary: '#202124', secondary: '#5f6368' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          borderRadius: 12,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: { fontWeight: 500 },
        subtitle1: { fontWeight: 500 },
        body1: { fontWeight: 500 },
        body2: { fontWeight: 500 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            backgroundColor: '#fff',
            fontWeight: 500,
          },
          '& input': { fontWeight: 500 },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'none',
        },
      },
    },
  },
});

// Component to display individual chat messages
const ChatMessage = ({ message }) => {
  const isUser = message.type === 'user';
  return (
    <ListItem sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 1 }}>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '70%',
          backgroundColor: isUser ? theme.palette.primary.main : '#fff',
          color: isUser ? '#fff' : theme.palette.text.primary,
          borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        }}
      >
        <Typography>{message.text}</Typography>
      </Paper>
    </ListItem>
  );
};

// Component to display the list of bookings
const BookingList = ({ bookings }) => {
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.booking_time) - new Date(b.booking_time)
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Bookings
      </Typography>
      {sortedBookings.length === 0 ? (
        <Typography color="text.secondary">No bookings found</Typography>
      ) : (
        <List>
          {sortedBookings.map((booking) => (
            <ListItem key={booking.id} divider>
              <ListItemText
                primary={
                  <Typography variant="subtitle1">
                    Booking ID: {booking.id} - {booking.technician.type}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      Technician: {booking.technician.name}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      Time: {new Date(booking.booking_time).toLocaleString()}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      Status: {booking.status}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

function App() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    { type: 'system', text: 'Hello! How can I help you today?' },
  ]);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [showBookings, setShowBookings] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to the bottom of the chat whenever new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch bookings when the component mounts
  useEffect(() => {
    fetchBookings();
    scrollToBottom();
  }, [scrollToBottom]);

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Helper to add a new message to the chat history
  const addMessage = useCallback((type, text) => {
    setMessages((prev) => [...prev, { type, text }]);
  }, []);

  // Fetch bookings from the API
  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/bookings/`);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      addMessage('system', 'Failed to fetch bookings');
    }
  }, [addMessage]);

  // Handle the chat form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentInput = userInput.trim();
    setUserInput('');
    addMessage('user', currentInput);
    setLoading(true);

    try {
      // Use the last five messages plus the current one for context
      const recentMessages = [...messages.slice(-5), { type: 'user', text: currentInput }].map((msg) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const { data } = await axios.post(`${API_URL}/process-request/`, {
        message: currentInput,
        conversation_history: recentMessages,
      });

      if (data.error) {
        addMessage('system', data.error);
      } else {
        addMessage('system', data.message);
        if (data.booking) {
          await fetchBookings();
        }
      }
    } catch (err) {
      console.error('Error details:', err);
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message || 'An unexpected error occurred';
      addMessage('system', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle deletion of all bookings
  const handleDeleteAllBookings = async () => {
    if (!window.confirm('Are you sure you want to delete all bookings? This action cannot be undone.')) {
      return;
    }
    setDeleteLoading(true);
    try {
      const { data } = await axios.delete(`${API_URL}/bookings/all/`);
      await fetchBookings();
      addMessage('system', data.message || 'All bookings have been deleted');
    } catch (error) {
      console.error('Error deleting bookings:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      addMessage('system', `Failed to delete bookings: ${errorMessage}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container
        maxWidth="md"
        sx={{
          py: 4,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 1, color: theme.palette.text.primary, fontWeight: 700 }}
        >
          Technician scheduling support
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3, color: theme.palette.text.secondary }}>
          We typically reply within a few minutes
        </Typography>

        {/* Chat Window */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            mb: 2,
            p: 2,
            overflowY: 'auto',
            backgroundColor: theme.palette.background.paper,
            border: '1px solid rgba(0, 0, 0, 0.12)',
          }}
        >
          <List>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {loading && (
              <ListItem sx={{ justifyContent: 'flex-start' }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor: '#fff',
                    borderRadius: '20px 20px 20px 4px',
                  }}
                >
                  <CircularProgress size={20} />
                </Paper>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        </Paper>

        {/* Input Form */}
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 0,
            backgroundColor: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
        >
          <TextField
            fullWidth
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            variant="outlined"
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { border: 'none' },
                borderRadius: 0,
              },
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            sx={{
              ml: 1,
              backgroundColor: theme.palette.primary.main,
              color: '#fff',
              borderRadius: 0,
              '&:hover': { backgroundColor: theme.palette.primary.dark },
            }}
          >
            <SendIcon />
          </IconButton>
        </Paper>

        {/* Bookings Dialog */}
        <Button variant="outlined" onClick={() => setShowBookings(true)} sx={{ mt: 2 }}>
          View All Bookings
        </Button>

        <Dialog
          open={showBookings}
          onClose={() => setShowBookings(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 500 }}>Current Bookings</DialogTitle>
          <DialogContent>
            <BookingList bookings={bookings} />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleDeleteAllBookings}
              color="error"
              disabled={deleteLoading || bookings.length === 0}
              sx={{ fontWeight: 500 }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete All Bookings'}
            </Button>
            <Button onClick={() => setShowBookings(false)} sx={{ fontWeight: 500 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App;
