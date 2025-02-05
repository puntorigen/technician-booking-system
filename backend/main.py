from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime, date
from typing import List
import logging
from contextlib import asynccontextmanager

from models import (
    Booking, BookingCreate, BookingRead,
    Technician, TechnicianRead,
    get_session, create_db_and_tables, engine,
    get_available_slots, get_technicians_by_type
)
from llm_processor import LLMProcessor
from seed_db import seed_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_seed_database():
    """Check if the database is empty and seed it if necessary."""
    with Session(engine) as session:
        # Check if there are any technicians
        statement = select(Technician)
        existing_technician = session.exec(statement).first()
        
        if not existing_technician:
            logger.info("No existing technicians found. Seeding database...")
            seed_database()
            logger.info("Database seeded successfully!")
        else:
            logger.info("Database already contains data. Skipping seeding.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Handles database initialization and cleanup.
    """
    # Startup: Create tables and seed database if needed
    logger.info("Starting up: Creating database tables...")
    create_db_and_tables()
    check_and_seed_database()
    
    yield  # Server is running
    
    # Shutdown: Clean up resources if needed
    logger.info("shutting down...")

app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM processor
llm_processor = LLMProcessor()

@app.get("/technicians/", response_model=List[TechnicianRead])
def get_technicians(
    technician_type: str = None,
    session: Session = Depends(get_session)
):
    """Get all technicians, optionally filtered by type."""
    if technician_type:
        return get_technicians_by_type(session, technician_type)
    else:
        statement = select(Technician).where(Technician.is_active == True)
        return session.exec(statement).all()

@app.get("/technicians/{technician_id}/availability")
def get_technician_availability(
    technician_id: int,
    date: date,
    session: Session = Depends(get_session)
):
    """Get available time slots for a technician on a specific date."""
    technician = session.get(Technician, technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # Convert date to datetime for the availability check
    date_dt = datetime.combine(date, datetime.min.time())
    available_slots = get_available_slots(session, technician_id, date_dt)
    
    return {
        "technician": {
            "id": technician.id,
            "name": technician.name,
            "type": technician.type,
            "working_hours": f"{technician.working_hours_start}:00 - {technician.working_hours_end}:00"
        },
        "date": date.isoformat(),
        "available_slots": [
            slot.strftime("%H:%M")
            for slot in available_slots
        ]
    }

def is_technician_available(session: Session, technician_id: int, booking_time: datetime):
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

@app.post("/process-request/")
async def process_request(request: dict):
    """Process a natural language booking request"""
    try:
        # Log the incoming request
        print("Processing request:", request)
        
        with Session(engine) as session:
            # Extract conversation history from request
            conversation_history = request.get("conversation_history", [])
            
            # Process the request with conversation history
            booking_request = await llm_processor.process_request(
                request["message"], 
                conversation_history,
                session
            )
            print("LLM Response:", booking_request)
            
            if not booking_request or not booking_request.action:
                raise ValueError("Invalid response from LLM processor")

            if booking_request.action == "create":
                # Validate technician type and time
                if not booking_request.technician_type:
                    error_msg = "I need to know what type of technician you need. Could you please specify if you need a plumber, electrician, or HVAC technician?"
                    return {"error": error_msg}
                
                if not booking_request.booking_time:
                    error_msg = "I need to know when you'd like to schedule the technician. Could you please specify a time?"
                    return {"error": error_msg}

                # Parse booking time from ISO format
                try:
                    booking_time = datetime.fromisoformat(booking_request.booking_time)
                except ValueError as e:
                    error_msg = f"Invalid booking time format: {str(e)}"
                    return {"error": error_msg}

                # Get technicians of requested type
                technicians = get_technicians_by_type(session, booking_request.technician_type)
                if not technicians:
                    error_msg = f"I'm sorry, but I couldn't find any {booking_request.technician_type}s available. We currently have plumbers, electricians, and HVAC technicians."
                    return {"error": error_msg}

                # Find available technician
                available_technician = None
                
                for technician in technicians:
                    if is_technician_available(session, technician.id, booking_time):
                        available_technician = technician
                        break

                if not available_technician:
                    error_msg = f"I apologize, but no {booking_request.technician_type}s are available at {booking_time.strftime('%I:%M %p on %B %d, %Y')}. Would you like to try a different time?"
                    return {"error": error_msg}

                # Create the booking
                booking = Booking(
                    technician_id=available_technician.id,
                    booking_time=booking_time,
                    description=f"Scheduled {booking_request.technician_type} appointment",
                    status="booked"
                )
                session.add(booking)
                session.commit()
                session.refresh(booking)

                # Create the response with full booking details
                booking_response = BookingRead(
                    id=booking.id,
                    technician_id=booking.technician_id,
                    booking_time=booking.booking_time,
                    description=booking.description,
                    status=booking.status,
                    technician=TechnicianRead(
                        id=available_technician.id,
                        name=available_technician.name,
                        type=available_technician.type,
                        working_hours_start=available_technician.working_hours_start,
                        working_hours_end=available_technician.working_hours_end,
                        is_active=available_technician.is_active
                    )
                )

                success_msg = f"Great! I've scheduled a {booking_request.technician_type} ({available_technician.name}) for you at {booking_time.strftime('%I:%M %p on %B %d, %Y')}. Your booking ID is {booking.id}."
                return {"message": success_msg, "booking": booking_response}

            elif booking_request.action == "cancel":
                print(f"\n=== Cancelling Booking {booking_request.booking_id} ===")
                if not booking_request.booking_id:
                    error_msg = "I need the booking ID to cancel an appointment. Could you please provide it?"
                    return {"error": error_msg}
                
                # Get the booking with a FOR UPDATE lock to prevent race conditions
                statement = select(Booking).where(Booking.id == booking_request.booking_id).with_for_update()
                booking = session.exec(statement).first()
                
                if not booking:
                    error_msg = f"I couldn't find booking {booking_request.booking_id}. Could you please verify the booking ID?"
                    return {"error": error_msg}
                
                print(f"Found booking: {booking.id} at {booking.booking_time} with status {booking.status}")
                
                if booking.status == "cancelled":
                    return {"message": f"Booking {booking.id} was already cancelled."}

                # Update the status
                booking.status = "cancelled"
                session.add(booking)
                
                # Explicitly commit the transaction
                try:
                    session.commit()
                    print(f"Successfully cancelled booking {booking.id}")
                    session.refresh(booking)
                    print(f"Verified booking status is now: {booking.status}")
                    
                    return {"message": f"I've cancelled booking {booking.id} for you. Is there anything else you need help with?"}
                except Exception as e:
                    print(f"Error committing cancellation: {str(e)}")
                    session.rollback()
                    raise ValueError(f"I'm sorry, but I couldn't cancel the booking due to a system error. Please try again later.")

            elif booking_request.action == "query":
                if not booking_request.booking_id:
                    error_msg = "I need the booking ID to look up the details. Could you please provide it?"
                    return {"error": error_msg}

                # Get the booking with technician information
                result = session.exec(
                    select(Booking, Technician)
                    .join(Technician)
                    .where(Booking.id == booking_request.booking_id)
                ).first()
                
                if not result:
                    error_msg = f"I couldn't find booking {booking_request.booking_id}. Could you please verify the booking ID?"
                    return {"error": error_msg}
                
                booking, technician = result
                booking_time = booking.booking_time.strftime("%I:%M %p on %B %d, %Y")
                
                # Create the response with full booking details
                booking_response = BookingRead(
                    id=booking.id,
                    technician_id=booking.technician_id,
                    booking_time=booking.booking_time,
                    description=booking.description,
                    status=booking.status,
                    technician=TechnicianRead(
                        id=technician.id,
                        name=technician.name,
                        type=technician.type,
                        working_hours_start=technician.working_hours_start,
                        working_hours_end=technician.working_hours_end,
                        is_active=technician.is_active
                    )
                )
                
                response = (
                    f"Here are the details for booking {booking.id}:\n"
                    f"- Time: {booking_time}\n"
                    f"- Technician: {technician.name} ({technician.type})\n"
                    f"- Status: {booking.status}\n"
                    f"- Working Hours: {technician.working_hours_start}:00-{technician.working_hours_end}:00"
                )
                
                return {"message": response, "booking": booking_response}

    except ValueError as e:
        error_msg = str(e)
        print("ValueError:", error_msg)
        return {"error": error_msg}
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("Unexpected error:", str(e))
        print("Full traceback:", error_trace)
        return {
            "error": f"An unexpected error occurred: {str(e)}",
            "traceback": error_trace
        }

@app.get("/bookings/", response_model=List[BookingRead])
def list_bookings(session: Session = Depends(get_session)):
    """List all active bookings"""
    print("\n=== Listing Bookings ===")
    
    # First, get all bookings to see what's in the database
    all_bookings = session.exec(select(Booking)).all()
    print("\nAll bookings in database:")
    for b in all_bookings:
        print(f"ID: {b.id}, Time: {b.booking_time}, Status: {b.status}")
    
    # Now get only active bookings
    print("\nFetching active bookings...")
    statement = (
        select(Booking, Technician)
        .join(Technician)
        .where(Booking.status == "booked")
        .order_by(Booking.booking_time)
    )
    
    results = session.exec(statement).all()
    print(f"\nFound {len(results)} active bookings")
    
    bookings = []
    for booking, technician in results:
        print(f"Adding booking #{booking.id}: {booking.booking_time} - {technician.name} ({technician.type}) - Status: {booking.status}")
        bookings.append(
            BookingRead(
                id=booking.id,
                technician_id=booking.technician_id,
                booking_time=booking.booking_time,
                description=booking.description,
                status=booking.status,
                technician=TechnicianRead(
                    id=technician.id,
                    name=technician.name,
                    type=technician.type,
                    working_hours_start=technician.working_hours_start,
                    working_hours_end=technician.working_hours_end,
                    is_active=technician.is_active
                )
            )
        )
    
    print("\nReturning bookings:", [b.id for b in bookings])
    return bookings

@app.get("/bookings/{booking_id}", response_model=BookingRead)
def get_booking(booking_id: int, session: Session = Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@app.delete("/bookings/{booking_id}")
def delete_booking(booking_id: int, session: Session = Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    session.delete(booking)
    session.commit()
    
    return {"message": f"Booking {booking_id} cancelled"}

@app.delete("/bookings/all/")
async def delete_all_bookings(session: Session = Depends(get_session)):
    """Delete all bookings from the database."""
    try:
        logger.info("Attempting to delete all bookings...")
        statement = select(Booking).where(Booking.status == "booked")
        bookings = session.exec(statement).all()
        
        count = len(bookings)
        logger.info(f"Found {count} bookings to delete")
        
        for booking in bookings:
            session.delete(booking)
        
        session.commit()
        logger.info(f"Successfully deleted {count} bookings")
        return {"message": f"Successfully deleted {count} bookings"}
    except Exception as e:
        logger.error(f"Error deleting bookings: {str(e)}")
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
