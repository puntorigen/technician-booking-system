from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel

class BookingRequest(SQLModel):
    message: str

class BookingResponse(SQLModel):
    action: str
    booking_id: Optional[int] = None
    message: str
    bookings: Optional[List[dict]] = None

class ParsedRequest(SQLModel):
    action: str
    booking_id: Optional[int] = None
    technician_type: Optional[str] = None
    booking_time: Optional[datetime] = None
    description: Optional[str] = None
