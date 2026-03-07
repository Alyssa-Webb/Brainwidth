import os
import io
from typing import List, Optional
from datetime import datetime
from pypdf import PdfReader
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load from root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"))

class ExtractedTask(BaseModel):
    title: str = Field(description="The title of the assignment, reading, or task.")
    duration: float = Field(description="Estimated duration in hours to complete the task. Default to 1.0 if unknown.")
    type: str = Field(description="The type of the task (e.g., 'STEM', 'Deep Work', 'Creative', 'Reading', 'Writing', 'Admin').")
    cognitive_weight: float = Field(description="The cognitive weight mapping from 0.1 to 1.0 based on technical complexity.")
    due_date: str = Field(description="The due date of the assignment in ISO format (YYYY-MM-DDTHH:MM:SS) if found, else return 'None'.")
    technical_complexity: str = Field(description="Brief description of the difficulty and complexity based on keywords like 'proof', 'implement', 'derive'.")

class TaskExtraction(BaseModel):
    tasks: List[ExtractedTask] = Field(description="List of tasks extracted from the document.")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts all text from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def parse_syllabus_and_extract_tasks(file_bytes: bytes) -> List[dict]:
    """Parse PDF, extract text, and use Gemini Flash to identify tasks."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set. Please set it to use the AI Parser.")

    print("Extracting text from PDF...")
    text = extract_text_from_pdf(file_bytes)
    print(f"Extracted {len(text)} characters.")
    
    # Initialize Gemini Flash via LangChain
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=api_key, temperature=0.1)
    
    # Create structured output
    structured_llm = llm.with_structured_output(TaskExtraction)
    
    prompt = f"""
    You are an AI assistant for "Flux", a cognitive load scheduling application.
    Analyze the following syllabus or document text. Find all assignments, exams, readings, and deliverables.
    
    For each item, extract:
    - Title
    - Estimated Duration (in hours)
    - Type (e.g., 'STEM', 'Reading', 'Writing', 'Deep Work', 'Admin')
    - Due Date (Format: YYYY-MM-DDTHH:MM:SS or 'None' if unspecified)
    
    Crucially, determine the 'Technical Complexity' and assign a 'cognitive_weight' (from 0.1 to 1.0).
    - Look for technical keywords like 'proof', 'implement', 'derive', 'analyze', 'calculate', 'design'.
    - If many technical keywords are present, assign a high cognitive_weight (e.g., 0.8 to 1.0).
    - If it's pure reading or simple admin, assign a lower weight (e.g., 0.2 to 0.4).
    
    Document Text:
    {text}
    """
    
    print("Calling Gemini Flash LLM to extract tasks...")
    result = structured_llm.invoke(prompt)
    print(f"Extracted {len(result.tasks)} tasks from the LLM.")
    
    tasks_to_return = []
    for task in result.tasks:
        # Try parsing date, default to current time if parsing fails or returns 'None'
        try:
            if task.due_date and task.due_date.lower() != 'none':
                parsed_date = datetime.fromisoformat(task.due_date.replace('Z', '+00:00'))
            else:
                parsed_date = datetime.utcnow()
        except Exception:
            parsed_date = datetime.utcnow()
            
        tasks_to_return.append({
            "title": task.title,
            "duration": task.duration,
            "type": task.type,
            "cognitive_weight": task.cognitive_weight,
            "due_date": parsed_date,
            "vector_embedding": [0.0] * 1536  # Placeholder vector embedding for MongoDB
        })
        
    return tasks_to_return
