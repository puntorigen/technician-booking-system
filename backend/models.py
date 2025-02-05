from datetime import datetime, timedelta, date
from typing import Optional, List, Union
from sqlmodel import Field, Session, SQLModel, create_engine, select
import os

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

# SQLModel configuration
DATABASE_URL = "sqlite:///./data/bookings.db"
engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

class TechnicianBase(SQLModel):
    name: str = Field(index=True)
    type: str
    working_hours_start: int = Field(default=9)  # 9 AM
    working_hours_end: int = Field(default=17)   # 5 PM
    is_active: bool = Field(default=True)

class Technician(TechnicianBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class TechnicianRead(TechnicianBase):
    id: int

class BookingBase(SQLModel):
    technician_id: int = Field(foreign_key="technician.id")
    booking_time: datetime
    description: str
    status: str = Field(default="booked")

class Booking(BookingBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class BookingCreate(BookingBase):
    pass

class BookingRead(BookingBase):
    id: int
    technician: Optional[TechnicianRead] = None

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def get_available_slots(session: Session, technician_id: int, date_or_datetime: Union[datetime, date]) -> List[datetime]:
    """
    Get available time slots for a technician on a specific date.
    
    Args:
        session: Database session
        technician_id: ID of the technician
        date_or_datetime: Date or datetime to check availability for
    
    Returns:
        List of available datetime slots
    """
    # Get technician's working hours
    technician = session.get(Technician, technician_id)
    if not technician or not technician.is_active:
        return []
    
    # Get all bookings for the technician on that date
    # Convert to date if datetime was passed
    target_date = date_or_datetime if isinstance(date_or_datetime, date) else date_or_datetime.date()
    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = start_of_day + timedelta(days=1)
    
    statement = select(Booking).where(
        Booking.technician_id == technician_id,
        Booking.status == "booked",
        Booking.booking_time >= start_of_day,
        Booking.booking_time < end_of_day
    )
    booked_slots = {
        booking.booking_time.hour 
        for booking in session.exec(statement).all()
    }
    
    # Generate available slots
    available_slots = []
    for hour in range(technician.working_hours_start, technician.working_hours_end):
        if hour not in booked_slots:
            slot_time = datetime.combine(target_date, datetime.min.time().replace(hour=hour))
            if slot_time > datetime.now():  # Only future slots
                available_slots.append(slot_time)
    
    return available_slots

def get_technicians_by_type(session: Session, technician_type: str) -> List[Technician]:
    """
    Get all active technicians of a specific type.
    
    Args:
        session: Database session
        technician_type: Type of technician to find (case-insensitive)
    
    Returns:
        List of matching technicians
    """
    # Convert technician_type to title case to match our seed data
    formatted_type = technician_type.title()
    statement = select(Technician).where(
        Technician.type == formatted_type,
        Technician.is_active == True
    )
    return session.exec(statement).all()

def is_technician_available(session: Session, technician_id: int, booking_time: datetime) -> bool:
    """
    Check if a technician is available at a specific time.
    
    Args:
        session: Database session
        technician_id: ID of the technician
        booking_time: Time to check availability for
    
    Returns:
        True if technician is available, False otherwise
    """
    # Get technician's working hours
    technician = session.get(Technician, technician_id)
    if not technician or not technician.is_active:
        return False
    
    # Check if time is within working hours
    if booking_time.hour < technician.working_hours_start or booking_time.hour >= technician.working_hours_end:
        return False
    
    # Check if technician already has a booking at this time
    existing_booking = session.exec(
        select(Booking).where(
            Booking.technician_id == technician_id,
            Booking.booking_time == booking_time,
            Booking.status == "booked"
        )
    ).first()
    
    return existing_booking is None
