import { createTheme } from "@mui/material"

// Define a custom MUI theme for SYNQUERY
export const theme = createTheme({
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
