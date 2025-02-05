import { useState, useEffect, useRef, useCallback } from "react"
import {
  Container,
  Typography,
  Button,
  Box,
  ThemeProvider,
} from "@mui/material"
import axios from "axios"
import { theme } from "./theme/theme"
import { ChatWindow } from "./components/ChatWindow"
import { ChatInput } from "./components/ChatInput"
import { BookingDialog } from "./components/BookingDialog"

// Use an environment variable for API URL if available
const API_URL = "http://localhost:8000"

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
  }, [messages, scrollToBottom])

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
            Technician Scheduling Support
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: "1.125rem",
              }}
            >
              We typically reply within a few minutes
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setShowBookings(true)}
              sx={{
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
          </Box>

          <ChatWindow 
            messages={messages}
            loading={loading}
            messagesEndRef={messagesEndRef}
          />

          <ChatInput
            userInput={userInput}
            loading={loading}
            onInputChange={(e) => setUserInput(e.target.value)}
            onSubmit={handleSubmit}
          />

          <BookingDialog
            open={showBookings}
            bookings={bookings}
            deleteLoading={deleteLoading}
            onClose={() => setShowBookings(false)}
            onDeleteAll={handleDeleteAllBookings}
          />
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App