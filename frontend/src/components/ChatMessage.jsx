import { ListItem, Paper, Typography } from "@mui/material"
import { theme } from "../theme/theme"

export const ChatMessage = ({ message }) => {
  const isUser = message.type === "user"
  return (
    <ListItem sx={{ justifyContent: isUser ? "flex-end" : "flex-start", mb: 1 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: "70%",
          backgroundColor: isUser ? theme.palette.primary.main : "#F0EDFF",
          color: isUser ? "#fff" : theme.palette.text.primary,
          borderRadius: 2,
        }}
      >
        <Typography variant="body1">{message.text}</Typography>
      </Paper>
    </ListItem>
  )
}
