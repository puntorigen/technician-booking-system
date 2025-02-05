import { useState, useEffect, useRef, useCallback } from "react"
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
  Box,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import axios from "axios"

// Use an environment variable for API URL if available
const API_URL = "http://localhost:8000"

// Define a custom MUI theme for SYNQUERY
const theme = createTheme({
  palette: {
    primary: {
      main: "#6B5ECD",
      light: "#8677E5",
      dark: "#5447A6",
    },
    background: {
      default: "#F8F6FF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#2D2D2D",
      secondary: "#6B7280",
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: "2.5rem",
      lineHeight: 1.2,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          border: "1px solid rgba(107, 94, 205, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          padding: "10px 20px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "& fieldset": {
              borderColor: "rgba(107, 94, 205, 0.2)",
            },
            "&:hover fieldset": {
              borderColor: "#6B5ECD",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#6B5ECD",
            },
          },
        },
      },
    },
  },
})

// Component to display individual chat messages
const ChatMessage = ({ message }) => {
  const isUser = message.type === "user"
  return (
    <ListItem sx={{ justifyContent: isUser ? "flex-end" : "flex-start", mb: 1 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: "70%",
          backgroundColor: isUser ? theme.palette.primary.main : theme.palette.background.default,
          color: isUser ? "#fff" : theme.palette.text.primary,
          borderRadius: 2,
        }}
      >
        <Typography variant="body1">{message.text}</Typography>
      </Paper>
    </ListItem>
  )
}

// Component to display the list of bookings
const BookingList = ({ bookings }) => {
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.booking_time) - new Date(b.booking_time))

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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

function App() {
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState([{ type: "system", text: "Hello! How can I help you today?" }])
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [showBookings, setShowBookings] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Scroll to the bottom of the chat whenever new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Fetch bookings when the component mounts
  useEffect(() => {
    fetchBookings()
    scrollToBottom()
  }, [scrollToBottom])

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  // Helper to add a new message to the chat history
  const addMessage = useCallback((type, text) => {
    setMessages((prev) => [...prev, { type, text }])
  }, [])

  // Fetch bookings from the API
  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/bookings/`)
      setBookings(data)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      addMessage("system", "Failed to fetch bookings")
    }
  }, [addMessage])

  // Handle the chat form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userInput.trim()) return

    const currentInput = userInput.trim()
    setUserInput("")
    addMessage("user", currentInput)
    setLoading(true)

    try {
      // Use the last five messages plus the current one for context
      const recentMessages = [...messages.slice(-5), { type: "user", text: currentInput }].map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.text,
      }))

      const { data } = await axios.post(`${API_URL}/process-request/`, {
        message: currentInput,
        conversation_history: recentMessages,
      })

      if (data.error) {
        addMessage("system", data.error)
      } else {
        addMessage("system", data.message)
        if (data.booking) {
          await fetchBookings()
        }
      }
    } catch (err) {
      console.error("Error details:", err)
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message || "An unexpected error occurred"
      addMessage("system", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle deletion of all bookings
  const handleDeleteAllBookings = async () => {
    if (!window.confirm("Are you sure you want to delete all bookings? This action cannot be undone.")) {
      return
    }
    setDeleteLoading(true)
    try {
      const { data } = await axios.delete(`${API_URL}/bookings/all/`)
      await fetchBookings()
      addMessage("system", data.message || "All bookings have been deleted")
    } catch (error) {
      console.error("Error deleting bookings:", error)
      const errorMessage = error.response?.data?.detail || error.message
      addMessage("system", `Failed to delete bookings: ${errorMessage}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 1,
              color: "primary.main",
              fontWeight: 700,
              fontSize: { xs: "1.75rem", md: "2.5rem" },
            }}
          >
            Expert Support Chat
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 4,
              color: "text.secondary",
              fontSize: "1.125rem",
            }}
          >
            We typically reply within a few minutes
          </Typography>

          {/* Chat Window */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              mb: 2,
              p: 3,
              minHeight: "60vh",
              maxHeight: "70vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "rgba(107, 94, 205, 0.1)",
            }}
          >
            <List>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {loading && (
                <ListItem sx={{ justifyContent: "flex-start" }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "background.default",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={20} sx={{ color: "primary.main" }} />
                    <Typography sx={{ color: "text.secondary" }}>Processing...</Typography>
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
            elevation={0}
            sx={{
              p: 2,
              display: "flex",
              gap: 2,
              alignItems: "center",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "rgba(107, 94, 205, 0.1)",
              borderRadius: 2,
            }}
          >
            <TextField
              fullWidth
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              variant="outlined"
              disabled={loading}
            />
            <IconButton
              type="submit"
              color="primary"
              disabled={loading || !userInput.trim()}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                p: 1,
                "&:hover": {
                  bgcolor: "primary.dark",
                },
                "&.Mui-disabled": {
                  bgcolor: "rgba(107, 94, 205, 0.3)",
                  color: "white",
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Paper>

          {/* View Bookings Button */}
          <Button
            variant="outlined"
            onClick={() => setShowBookings(true)}
            sx={{
              mt: 3,
              borderColor: "primary.main",
              color: "primary.main",
              "&:hover": {
                borderColor: "primary.dark",
                bgcolor: "rgba(107, 94, 205, 0.05)",
              },
            }}
          >
            View All Bookings
          </Button>

          {/* Bookings Dialog */}
          <Dialog
            open={showBookings}
            onClose={() => setShowBookings(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 2,
              },
            }}
          >
            <DialogTitle
              sx={{
                color: "primary.main",
                fontWeight: 600,
              }}
            >
              Current Bookings
            </DialogTitle>
            <DialogContent>
              <BookingList bookings={bookings} />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleDeleteAllBookings}
                color="error"
                disabled={deleteLoading || bookings.length === 0}
                sx={{
                  fontWeight: 500,
                  "&:hover": {
                    bgcolor: "rgba(211, 47, 47, 0.04)",
                  },
                }}
              >
                {deleteLoading ? "Deleting..." : "Delete All Bookings"}
              </Button>
              <Button
                onClick={() => setShowBookings(false)}
                sx={{
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: "rgba(107, 94, 205, 0.05)",
                  },
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App