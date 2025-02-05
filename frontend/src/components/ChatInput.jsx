import { Paper, TextField, IconButton } from "@mui/material"
import SendIcon from "@mui/icons-material/Send"

export const ChatInput = ({ userInput, loading, onInputChange, onSubmit }) => {
  return (
    <Paper
      component="form"
      onSubmit={onSubmit}
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
        onChange={onInputChange}
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
  )
}
