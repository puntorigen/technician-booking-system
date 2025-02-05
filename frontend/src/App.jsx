import { useState, useEffect, useRef } from 'react'
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
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import axios from 'axios'

const API_URL = 'http://localhost:8000'  // Always use localhost since we're accessing from browser

function App() {
  const [userInput, setUserInput] = useState('')
  const [messages, setMessages] = useState([
    { type: 'system', text: 'Hello! How can I help you today?' }
  ])
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [showBookings, setShowBookings] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    fetchBookings()
    scrollToBottom()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchBookings = async () => {
    try {
      console.log("Fetching bookings...")
      const response = await axios.get(`${API_URL}/bookings/`)
      console.log("Received bookings:", response.data)
      setBookings(response.data)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      addMessage('system', "Failed to fetch bookings")
    }
  }

  const addMessage = (type, text) => {
    setMessages(prev => [...prev, { type, text }])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userInput.trim()) return

    const currentInput = userInput
    setUserInput('')
    addMessage('user', currentInput)
    setLoading(true)

    try {
      // Get last 5 messages for context
      const recentMessages = messages.slice(-5).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))

      console.log("Submitting request:", currentInput)
      console.log("With context:", recentMessages)
      
      const response = await axios.post(`${API_URL}/process-request/`, {
        message: currentInput,
        conversation_history: recentMessages
      })
      console.log("Received response:", response.data)

      if (response.data.error) {
        addMessage('system', response.data.error)
      } else {
        // Always show the natural language message
        addMessage('system', response.data.message)
        
        // If we have booking data, update the list
        if (response.data.booking) {
          await fetchBookings()
        }
      }
    } catch (err) {
      console.error('Error details:', err)
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'An unexpected error occurred'
      addMessage('system', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAllBookings = async () => {
    if (!window.confirm('Are you sure you want to delete all bookings? This action cannot be undone.')) {
      return;
    }
    
    setDeleteLoading(true);
    try {
      console.log('Attempting to delete all bookings...');
      const response = await axios.delete(`${API_URL}/bookings/all/`);  
      console.log('Delete response:', response.data);
      await fetchBookings();
      addMessage('system', response.data.message || 'All bookings have been deleted');
    } catch (error) {
      console.error('Error deleting bookings:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      addMessage('system', `Failed to delete bookings: ${errorMessage}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const BookingList = ({ bookings }) => {
    // Sort bookings by booking_time
    const sortedBookings = [...bookings].sort((a, b) => 
      new Date(a.booking_time) - new Date(b.booking_time)
    )

    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bookings
        </Typography>
        {sortedBookings.length === 0 ? (
          <Typography color="text.secondary">
            No bookings found
          </Typography>
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
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 3 }}>
        Technician scheduling support
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        We typically reply within a few minutes
      </Typography>

      {/* Chat Messages */}
      <Paper 
        sx={{ 
          flex: 1, 
          mb: 2, 
          p: 2, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}
          >
            <Paper
              sx={{
                p: 2,
                bgcolor: message.type === 'user' ? 'primary.main' : 'grey.100',
                color: message.type === 'user' ? 'white' : 'text.primary',
                borderRadius: 2
              }}
            >
              <Typography>{message.text}</Typography>
            </Paper>
          </Box>
        ))}
        {loading && (
          <Box sx={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography component="span">Thinking...</Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Input Form */}
      <Paper 
        component="form" 
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}
      >
        <TextField
          fullWidth
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          variant="outlined"
          disabled={loading}
          size="small"
        />
        <IconButton 
          type="submit" 
          color="primary" 
          disabled={loading || !userInput.trim()}
          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          <SendIcon />
        </IconButton>
      </Paper>

      {/* Bookings List - Now in a dialog */}
      <Button 
        variant="outlined" 
        onClick={() => setShowBookings(true)}
        sx={{ mt: 2 }}
      >
        View All Bookings
      </Button>
      
      <Dialog 
        open={showBookings} 
        onClose={() => setShowBookings(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Current Bookings</DialogTitle>
        <DialogContent>
          <BookingList bookings={bookings} />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteAllBookings} 
            color="error" 
            disabled={deleteLoading || bookings.length === 0}
          >
            {deleteLoading ? 'Deleting...' : 'Delete All Bookings'}
          </Button>
          <Button onClick={() => setShowBookings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default App
