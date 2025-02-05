from datetime import datetime
from sqlmodel import Session
from models import create_db_and_tables, engine, Booking, Technician
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initial technicians data
INITIAL_TECHNICIANS = [
    {
        "name": "Nicolas Woollett",
        "type": "Plumber",
        "working_hours_start": 9,   # 9 AM
        "working_hours_end": 17,    # 5 PM
    },
    {
        "name": "Franky Flay",
        "type": "Electrician",
        "working_hours_start": 9,   # 9 AM
        "working_hours_end": 19,    # 7 PM
    },
    {
        "name": "Griselda Dickson",
        "type": "Welder",
        "working_hours_start": 8,   # 8 AM
        "working_hours_end": 16,    # 4 PM
    }
]

# Initial bookings data
INITIAL_BOOKINGS = [
    {
        "technician_name": "Nicolas Woollett",
        "booking_time": datetime(2025, 10, 15, 10, 0),  # 15/10/2022 at 10:00AM
    },
    {
        "technician_name": "Franky Flay",
        "booking_time": datetime(2025, 10, 16, 18, 0),  # 16/10/2022 at 6:00PM
    },
    {
        "technician_name": "Griselda Dickson",
        "booking_time": datetime(2025, 10, 18, 11, 0),  # 18/10/2022 at 11:00AM
    }
]

def create_initial_technicians(session: Session):
    """Create the initial set of technicians."""
    technicians = []
    for tech_data in INITIAL_TECHNICIANS:
        technician = Technician(**tech_data)
        session.add(technician)
        technicians.append(technician)
    session.commit()
    return technicians

def create_initial_bookings(session: Session, technicians: list[Technician]):
    """Create the initial set of bookings."""
    bookings = []
    
    # Create a mapping of technician names to their IDs
    tech_map = {tech.name: tech.id for tech in technicians}
    
    for booking_data in INITIAL_BOOKINGS:
        tech_id = tech_map[booking_data["technician_name"]]
        tech = next(t for t in technicians if t.id == tech_id)
        
        # Verify booking is within working hours
        booking_hour = booking_data["booking_time"].hour
        if not (tech.working_hours_start <= booking_hour < tech.working_hours_end):
            logger.warning(
                f"Warning: Booking for {tech.name} at {booking_hour}:00 is outside "
                f"their working hours ({tech.working_hours_start}:00-{tech.working_hours_end}:00)"
            )
        
        booking = Booking(
            technician_id=tech_id,
            booking_time=booking_data["booking_time"],
            description=f"Initial booking for {tech.type}"
        )
        session.add(booking)
        bookings.append(booking)
    
    session.commit()
    return bookings

def seed_database():
    """Seed the database with initial technicians and bookings."""
    try:
        # Create tables if they don't exist
        create_db_and_tables()
        
        with Session(engine) as session:
            # First create technicians
            logger.info("Creating initial technicians...")
            technicians = create_initial_technicians(session)
            
            # Then create their bookings
            logger.info("Creating initial bookings...")
            bookings = create_initial_bookings(session, technicians)
            
            # Log the created data
            logger.info("\nCreated the following technicians and their bookings:")
            logger.info("-" * 80)
            for tech in technicians:
                logger.info(f"Technician: {tech.name}")
                logger.info(f"Type: {tech.type}")
                logger.info(f"Working Hours: {tech.working_hours_start}:00 - {tech.working_hours_end}:00")
                
                # Find this technician's bookings
                tech_bookings = [b for b in bookings if b.technician_id == tech.id]
                if tech_bookings:
                    logger.info("Bookings:")
                    for booking in tech_bookings:
                        logger.info(f"  - {booking.booking_time.strftime('%d/%m/%Y at %I:%M%p')}")
                logger.info("-" * 80)
        
        return True
    except Exception as e:
        logger.error(f"Error seeding database: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Seeding database with initial data...")
    if seed_database():
        logger.info("Database seeded successfully!")
    else:
        logger.error("Failed to seed database.")
