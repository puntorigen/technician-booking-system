import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import { BookingList } from "./BookingList"

export const BookingDialog = ({ open, bookings, deleteLoading, onClose, onDeleteAll }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          onClick={onDeleteAll}
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
          onClick={onClose}
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
  )
}
