from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage
from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from sqlmodel import select
from models import (
    Technician, 
    Booking, 
    get_available_slots, 
    get_technicians_by_type,
    is_technician_available
)

# Load environment variables
load_dotenv()

class BookingRequest(BaseModel):
    action: str = Field(description="Action to take: 'create' for new bookings, 'cancel' for cancellations, 'query' for getting booking details")
    technician_type: Optional[str] = Field(None, description="Type of technician needed (e.g., 'plumber', 'electrician'). Required for 'create' action.")
    booking_time: Optional[str] = Field(None, description="The requested booking time in ISO format. Required for 'create' action.")
    booking_id: Optional[int] = Field(None, description="Booking ID for cancellations or queries. Required for 'cancel' and 'query' actions.")

    @model_validator(mode='after')
    def validate_fields_by_action(self) -> 'BookingRequest':
        """Validate that required fields are present based on the action"""
        if self.action == "create":
            if not self.technician_type:
                raise ValueError("technician_type is required for create action")
            if not self.booking_time:
                raise ValueError("booking_time is required for create action")
        elif self.action in ["cancel", "query"]:
            if not self.booking_id:
                raise ValueError("booking_id is required for cancel and query actions")
        return self

class LLMProcessor:
    def __init__(self):
        # Initialize Groq with DeepSeek model
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
            
        self.llm = ChatGroq(
            groq_api_key=api_key,
            model_name="deepseek-r1-distill-llama-70b",
            temperature=0.1,
            max_tokens=1024
        )

        # Initialize the memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="output"
        )

        # Initialize the output parser
        self.parser = PydanticOutputParser(pydantic_object=BookingRequest)

        # Create the system message
        self.system_message = SystemMessage(content="""You are a booking assistant that processes technician booking requests. 
Your task is to extract booking information and return it in JSON format according to the schema below.

STRICT RULES FOR TIME INTERPRETATION:
1. When user says:
   - "tomorrow at X": use tomorrow's date at time X
   - "today at X": use today's date at time X
   - "in X hours/minutes": add X hours/minutes to current time
   - "at X": use today's date at time X
   - Just a time (e.g., "2pm"): use today's date
   - "as soon as possible" or similar: use the earliest available slot from the technician info below
2. ALL times must be in exact hours (00 minutes, 00 seconds)
3. If a time would be in the past, use tomorrow instead

STRICT RULES FOR ACTION INTERPRETATION:
1. Use action="create" when user wants to:
   - Book a technician
   - Schedule an appointment
   - Make a booking
   - Request a service
2. Use action="cancel" when user wants to:
   - Cancel a booking
   - Remove a booking
   - Delete a booking
   - Cancel an appointment
3. Use action="query" when user wants to:
   - Get booking details
   - Check booking status
   - Show booking information
   - View booking details
4. IMPORTANT: If a booking ID is mentioned in the conversation history, use it for cancel/query actions

EXAMPLE RESPONSES:
1. Creating a booking:
   {"action": "create", "technician_type": "plumber", "booking_time": "2025-02-04T14:00:00"}

2. Cancelling a booking:
   {"action": "cancel", "booking_id": 123}

3. Querying a booking:
   {"action": "query", "booking_id": 123}

Return ONLY the JSON response, no explanation or thinking steps.""")

        # Create the prompt template for user inputs
        self.prompt = PromptTemplate(
            template="""Current time: {current_time}

TECHNICIAN AVAILABILITY:
{technician_info}

For "as soon as possible" requests:
1. Look at the "Next available slots today" for technicians of the requested type
2. Pick the earliest available slot
3. If no slots are available today, use tomorrow at the technician's working_hours_start

Previous conversation:
{chat_history}

User message: {query}

{format_instructions}""",
            input_variables=["query", "current_time", "technician_info", "chat_history"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )

    async def get_technician_info(self, session) -> str:
        """Get information about all technicians and their availability"""
        technicians = session.exec(select(Technician)).all()
        
        # Group technicians by type
        technicians_by_type = {}
        for tech in technicians:
            if tech.type not in technicians_by_type:
                technicians_by_type[tech.type] = []
            technicians_by_type[tech.type].append(tech)
        
        # Format the information
        info_parts = []
        info_parts.append("Available technician types:")
        for tech_type, techs in technicians_by_type.items():
            info_parts.append(f"\n{tech_type.upper()}:")
            for tech in techs:
                info_parts.append(f"- {tech.name}")
                info_parts.append(f"  Working hours: {tech.working_hours_start}:00-{tech.working_hours_end}:00")
                
                # Get next available slots
                today = datetime.now().date()
                available_slots = get_available_slots(session, tech.id, today)
                if available_slots:
                    slots_str = ", ".join(slot.strftime("%I:%M %p") for slot in available_slots[:3])
                    info_parts.append(f"  Next available slots today: {slots_str}")
                else:
                    info_parts.append("  No available slots today")
                info_parts.append("")  # Empty line between technicians
        
        return "\n".join(info_parts)

    async def process_request(self, user_input: str, conversation_history: list, session) -> BookingRequest:
        """Process the user input and return structured booking information asynchronously"""
        # Get current time for context
        current_time = datetime.now()
        
        # Get technician info for context
        technician_info = await self.get_technician_info(session)
        
        # Load conversation history into memory
        if conversation_history:
            self.memory.clear()  # Clear existing memory
            for msg in conversation_history:
                if msg['role'] == 'user':
                    self.memory.chat_memory.add_user_message(msg['content'])
                else:
                    self.memory.chat_memory.add_ai_message(msg['content'])
        
        # Get chat history from memory
        memory_vars = self.memory.load_memory_variables({})
        chat_history = memory_vars.get("chat_history", "")
        
        # Format the prompt with all context
        prompt = self.prompt.format(
            query=user_input,
            current_time=current_time.isoformat(),
            technician_info=technician_info,
            chat_history=chat_history
        )
        
        # Get response from LLM
        response = await self.llm.ainvoke(prompt)
        response_text = response.content
        print("\nLLM Response:", response_text)
        
        try:
            # Parse the response
            booking_request = self.parser.parse(response_text)
            
            # If this is a create request, ensure the booking time is in the future
            if booking_request.action == "create" and booking_request.booking_time:
                try:
                    # Parse the booking time
                    booking_time = datetime.fromisoformat(booking_request.booking_time)
                    
                    # If the time is in the past, raise an error
                    if booking_time < current_time:
                        raise ValueError("Booking time must be in the future")
                    
                    # Ensure minutes and seconds are set to 0
                    booking_time = booking_time.replace(minute=0, second=0, microsecond=0)
                    
                    # Update the booking time in ISO format
                    booking_request.booking_time = booking_time.isoformat()
                except ValueError as e:
                    raise ValueError(f"Invalid booking time: {str(e)}")
            
            # Save the interaction to memory
            self.memory.chat_memory.add_user_message(user_input)
            self.memory.chat_memory.add_ai_message(response_text)
            
            return booking_request
        except Exception as e:
            print("\nError parsing LLM response:", str(e))
            raise ValueError(f"Failed to parse LLM response: {str(e)}")

    def format_datetime(self, date_str: str) -> datetime:
        """Convert various datetime formats to a standard datetime object"""
        try:
            # First try parsing as ISO format
            try:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError(f"Invalid datetime format: {date_str}. Must be in ISO format (YYYY-MM-DDTHH:00:00)")

            # Round to the nearest hour
            dt = dt.replace(minute=0, second=0, microsecond=0)
            
            # If the time is in the past and it's today, move it to tomorrow
            now = datetime.now()
            if dt < now:
                if dt.date() == now.date():
                    dt = dt + timedelta(days=1)
                else:
                    raise ValueError("Booking time must be in the future")
            
            return dt
            
        except Exception as e:
            print(f"Error formatting datetime: {str(e)}")
            raise ValueError(f"Invalid datetime format: {date_str}. Must be in ISO format (YYYY-MM-DDTHH:00:00)")
