# Backend Service

The backend service is built with FastAPI and SQLModel, providing a robust API for technician booking management with natural language processing capabilities.

## Architecture

### Core Components

- **FastAPI Application** (`main.py`): Main application entry point and API routes
- **Database Models** (`models.py`): SQLModel-based data models and database utilities
- **LLM Processing** (`llm_processor.py`): Natural language processing using LangChain and Groq
- **Database Seeding** (`seed_db.py`): Initial data setup and seeding functionality

### Database Schema

The application uses SQLite with SQLModel (SQLAlchemy + Pydantic) for data persistence:

- **Technician**: Stores technician information and availability
  - Fields: id, name, type, working_hours_start, working_hours_end, is_active
- **Booking**: Manages appointment bookings
  - Fields: id, technician_id, booking_time, description, status

## API Endpoints

### Bookings
- `GET /bookings/`: List all active bookings
- `POST /bookings/`: Create a new booking
- `GET /bookings/{id}`: Get booking details
- `DELETE /bookings/{id}`: Cancel a booking
- `DELETE /bookings/all/`: Delete all active bookings

### Technicians
- `GET /technicians/`: List all technicians
- `GET /technicians/{id}/availability/{date}`: Get technician's available slots

### Natural Language Processing
- `POST /process-request/`: Process natural language booking requests

## Development Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Groq API key

4. Run the development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Key Features

### Automatic Database Management
- Automatic table creation on startup
- Database seeding when empty
- SQLite persistence using Docker volumes

### Natural Language Processing
- Integration with Groq's LLM for request interpretation
- Contextual conversation history
- Intelligent booking slot suggestions

### Error Handling
- Comprehensive error responses
- Transaction management
- Input validation using Pydantic models

## Docker Support

The service is containerized using Docker:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p data
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

## Testing

Access the interactive API documentation at `http://localhost:8000/docs` when the server is running.

## Environment Variables

- `GROQ_API_KEY`: Your Groq API key for LLM functionality
- Database configuration is handled through `DATABASE_URL` in `models.py`
