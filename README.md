# Brainwidth

Brainwidth is an AI-powered cognitive scheduling application that optimizes your daily tasks based on your personal Chronotype, cognitive load limits, and personal goals. It intelligently calculates the mental tax of different tasks and schedules them within your peak productivity windows, while automatically injecting necessary decompression breaks based on your current schedule's intensity.

## Features

- **Chronotype Scheduling:** Automatically restricts tasks and sets ideal work hours according to your biological chronotype (Lion, Bear, Wolf, Dolphin).
- **Cognitive Load Optimization:** Assigns mental tax weights to each type of task (Deep Work, Admin, Rest, etc.) to prevent you from getting burned out.
- **Decompression Breaks:** Intelligently inserts micro-breaks and long gaps into your schedule if your cognitive load starts accumulating too heavily.
- **Goal Infusion:** Fulfills personal goals by suggesting activities during gap recovery periods.
- **Syllabus Parsing:** Extracts tasks and projects directly from syllabi via AI analysis.
- **Google Calendar Integration:** Syncs intelligently with your real-life fixed events while calculating their mental toll.

## Prerequisites

Ensure you have the following installed to run Brainwidth locally:
- Python 3.10+
- Node.js & npm (for the frontend)
- MongoDB instance (make sure to set this in your backend `.env` file)
- Gemini API Key (or Google API Key)

## Installation & Setup

1. **Clone the repository** (if you haven't already).

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # If you use prisma inside the frontend directory, initialize the DB schema:
   npx -y prisma@5 db push
   ```

3. **Backend Setup**
   ```bash
   cd backend
   # Set up a virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install backend dependencies
   pip install -r requirements.txt
   ```
   *Make sure you create a `.env` file in the `backend` directory with your necessary database and API keys.*

## Running the Application

You need to run both the frontend development server and the backend FastAPI application simultaneously.

### 1. Start the Frontend
Open a terminal and navigate to the frontend directory:
```bash
cd frontend
npm run dev
```

### 2. Start the Backend
Open a new terminal and navigate to the backend directory:
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Usage
Once both servers are running, access the web client at `http://localhost:3000`. Set up your Chronotype in your Profile, input your goals, and start generating your optimized AI schedule!
