# Technician Booking System

A full-stack application for managing technician bookings and appointments.

## Demo

![Demo of the Technician Booking System](docs/demo-small.gif)

The demo shows the main features of the application:
- Natural language booking creation
- Real-time chat interface
- Viewing all bookings
- Modern and responsive UI

## Project Structure

```
technician-booking-system/
├── backend/          # FastAPI backend service with SQLModel, LangChain and Groq
├── frontend/         # Vite + React frontend application
└── docs/             # readme assets
```

## Features

- Schedule technician appointments
- List all bookings
- Retrieve booking details
- Delete/cancel individual bookings
- Bulk delete all bookings
- Natural language processing using LangChain with Groq
- Modern UI with Material UI and Vite
- RESTful API backend with SQLModel (SQLAlchemy + Pydantic)
- Docker support for easy deployment

## Requirements

### Local Development
#### Backend
- Python 3.8+
- FastAPI
- SQLModel
- LangChain
- langchain-groq
- Groq API Key

#### Frontend
- Node.js 14+
- Vite 5+
- React 18+
- Material UI
- Axios

### Docker Development
- Docker
- Docker Compose

## Setup Instructions

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd technician-booking-system
```

2. Set up environment variables:
```bash
# Copy the example .env file and edit it with your Groq API key
cp .env.example .env
```

3. Build and start the containers:
```bash
docker-compose up --build
```

The services will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

Note: The SQLite database is persisted in a Docker volume named `sqlite_data`. To completely reset the database, you can remove this volume:
```bash
docker-compose down -v
```

### Local Development Setup

#### Backend Setup

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

2. Set up environment variables:
Create a `.env` file in the backend directory with:
```
GROQ_API_KEY=your_groq_api_key_here
```

3. Seed the database (optional):
```bash
python seed_db.py
```
This will create sample bookings with various technician types and time slots.

4. Run the backend server:
```bash
uvicorn main:app --reload
```

#### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

The development server will start at `http://localhost:5173` by default.

## API Endpoints

The backend provides the following RESTful endpoints:

### Bookings
- `GET /bookings/`: List all active bookings
- `POST /bookings/`: Create a new booking
- `GET /bookings/{id}`: Get details of a specific booking
- `DELETE /bookings/{id}`: Cancel a specific booking
- `DELETE /bookings/all/`: Delete all active bookings

### Technicians
- `GET /technicians/`: List all technicians
- `GET /technicians/{id}/availability/{date}`: Get available slots for a technician on a specific date

### Natural Language Processing
- `POST /process-request/`: Process a natural language booking request

## API Documentation

The API documentation is available at `http://localhost:8000/docs` when running the backend server.

## Database Schema

The application uses SQLite with SQLModel (SQLAlchemy + Pydantic) for the database. Here's the entity relationship diagram:

```mermaid
erDiagram
    Technician {
        int id PK
        string name
        string type
        int working_hours_start
        int working_hours_end
        boolean is_active
    }
    Booking {
        int id PK
        int technician_id FK
        datetime booking_time
        string description
        string status
    }
    Technician ||--o{ Booking : "has"
```

### Database Initialization

The application includes automatic database initialization and seeding:

1. **Automatic Initialization**: When the backend starts up, it checks if the database is empty (no technicians exist).
2. **Automatic Seeding**: If the database is empty, it automatically seeds it with initial technicians and bookings.
3. **Data Persistence**: All data is stored in a SQLite database within a Docker volume, ensuring persistence across container restarts.
4. **Reset Option**: To reset the database to its initial state, simply remove the Docker volume and restart the containers.

### Initial Data

The seeding process creates the following initial data:

1. Nicolas Woollett
   - Type: Plumber
   - Working Hours: 9:00 - 17:00
   - Initial Booking: 15/10/2025 at 10:00AM

2. Franky Flay
   - Type: Electrician
   - Working Hours: 9:00 - 19:00
   - Initial Booking: 16/10/2025 at 6:00PM

3. Griselda Dickson
   - Type: Welder
   - Working Hours: 8:00 - 16:00
   - Initial Booking: 18/10/2025 at 11:00AM

## Natural Language Processing

The system uses LangChain with Groq's DeepSeek model to process natural language booking requests. The LLM can handle various types of requests:

- Creating bookings: "I need a plumber tomorrow at 2pm"
- Canceling bookings: "Cancel booking 123"
- Querying bookings: "What's the status of booking 456?"

The system leverages Groq's high-performance cloud infrastructure for fast and reliable responses.

## Notes and Future Improvements

### Current Limitations

- The system currently operates in the server's local timezone
- Booking times are stored and displayed without timezone context

## Docker Development

The project includes Docker support for both development and production environments:

### Key Features
- Separate containers for frontend and backend services
- Volume mounts for live code updates
- Environment variable management
- Network isolation between services
- Hot-reloading support for both frontend and backend
- Persistent SQLite database using Docker volumes
- Automatic database initialization and seeding

### Common Commands

```bash
# Start the services
docker-compose up

# Rebuild and start the services
docker-compose up --build

# Stop the services
docker-compose down

# Stop the services and reset the database
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f backend
docker-compose logs -f frontend
