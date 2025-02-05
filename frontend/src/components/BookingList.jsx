import { Paper, Typography, List, ListItem, ListItemText } from "@mui/material"
import { theme } from "../theme/theme"

export const BookingList = ({ bookings }) => {
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.booking_time) - new Date(b.booking_time))

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
        Bookings
      </Typography>
      {sortedBookings.length === 0 ? (
        <Typography>No bookings found</Typography>
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
                    <Typography component="span" variant="body2" display="block">
                      Time: {new Date(booking.booking_time).toLocaleString()}
                    </Typography>
                    <Typography component="span" variant="body2" display="block">
                      Technician: {booking.technician.name}
                    </Typography>
                    <Typography component="span" variant="body2" display="block">
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
