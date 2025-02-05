import { Paper, List, ListItem, CircularProgress, Typography } from "@mui/material"
import { ChatMessage } from "./ChatMessage"

export const ChatWindow = ({ messages, loading, messagesEndRef }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        mb: 2,
        p: 3,
        minHeight: "40vh",
        maxHeight: "50vh",
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
  )
}
