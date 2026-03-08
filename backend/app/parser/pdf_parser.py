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

class ClassDifficulty(BaseModel):
    course_name: str = Field(description="The name of the course or class.")
    difficulty_score: float = Field(description="A daily cognitive load penalty from 0.5 to 2.0. 0.5 is very easy, 1.0 is average, 2.0 is exceptionally difficult.")
    reasoning: str = Field(description="Brief justification for the assigned difficulty score.")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts all text from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def parse_syllabus_and_extract_tasks(file_bytes: bytes) -> dict:
    """Parse PDF, extract text, and use Gemini Flash to identify overall class difficulty."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set. Please set it to use the AI Parser.")

    print("Extracting text from PDF...")
    text = extract_text_from_pdf(file_bytes)
    print(f"Extracted {len(text)} characters.")
    
    # Initialize Gemini Flash via LangChain
    llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite-preview", api_key=api_key, temperature=0.1)
    
    # Create structured output
    structured_llm = llm.with_structured_output(ClassDifficulty)
    
    prompt = f"""
    You are an AI assistant for "Brainwidth", a cognitive load scheduling application.
    Analyze the following syllabus or document text to determine the overall difficulty of the class.
    
    Extract the following:
    - Course Name
    - Difficulty Score: A daily cognitive load penalty from 0.5 to 2.0. 
        - 0.5: Very easy, minimal daily effort (e.g. elective, light reading)
        - 0.8: Below average workload
        - 1.0: Standard class
        - 1.5: Difficult class (e.g. advanced STEM, heavy project-based, fast-paced summer course)
        - 2.0: Exceptionally demanding (graduate-level, extreme workload, high failure rate)
    - Reasoning: A short 1-2 sentence justification for this score based on the syllabus contents (e.g., exams, grading scale, assignments).
    
    Document Text:
    {text}
    """
    
    print("Calling Gemini Flash LLM to analyze course difficulty...")
    result = structured_llm.invoke(prompt)
    print(f"Extracted Course: {result.course_name} with score {result.difficulty_score}")
    
    return {
        "title": result.course_name,
        "mental_tax": round(result.difficulty_score, 2),
        "reasoning": result.reasoning
    }
