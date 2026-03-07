# Flux: Cognitive Load Scheduler - Architecture Plan

## 1. Overview
Flux is an AI-driven scheduling application designed to optimize daily productivity based on cognitive load rather than purely time. It leverages a unique **Mental Tax** formula to ensure users stay within a sustainable daily energy capacity.

### Core Formula
`T = Σ (d_i × w_i) + δ`
- **T**: Total Mental Tax
- **d_i**: Duration of the task
- **w_i**: Cognitive Weight (e.g., STEM/Deep Work = 0.9, Admin/Shallow Work = 0.3)
- **δ**: Context-switch penalty (+0.15 added when switching between vastly different context types)

## 2. Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS
- **Backend / Math Engine**: FastAPI (Python)
- **Database**: MongoDB Atlas with Vector Search (for AI-driven task similarity and intelligent scheduling)

## 3. High-Level Modular Separation
The architecture employs a strictly decoupled client-server model:
- **Next.js Frontend (Client)**: Handles user interaction, task input, calendar rendering, and visual cognitive load indicators. It acts purely as a presentation layer.
- **FastAPI Engine (Server)**: The "brain" of the application. It houses the complex mathematical logic (the Mental Tax engine), routing algorithms, AI embeddings generation, and database interactions.

## 4. File Structure

```text
flux-scheduler/
│
├── frontend/                      # Next.js Application (React)
│   ├── src/
│   │   ├── app/                   # App Router
│   │   │   ├── page.tsx           # Main Dashboard
│   │   │   ├── layout.tsx         # Global Layout
│   │   │   └── api/               # NextAuth or simple BFF routes
│   │   ├── components/            # Reusable React UI Components
│   │   │   ├── CalendarView.tsx   # Renders the daily block schedule
│   │   │   ├── TaskInput.tsx      # Form to input tasks & durations
│   │   │   └── LoadMeter.tsx      # Visual indicator for daily Mental Tax capacity
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   └── useSchedule.ts     # Manages data fetching & state from FastAPI
│   │   ├── types/                 # TypeScript Interfaces
│   │   │   └── index.ts           # Definitions for Task, Schedule, LoadMetrics
│   │   └── utils/
│   │       └── apiClient.ts       # Axios wrapper targeting FastAPI Python backend
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/                       # FastAPI Application (Python)
│   ├── app/
│   │   ├── main.py                # FastAPI application initialization
│   │   ├── api/                   # REST Endpoints
│   │   │   ├── routes.py          # /schedule/generate, /tasks
│   │   │   └── dependencies.py    # Auth, DB dependency injections
│   │   ├── engine/                # Core Math & Scheduling Engine
│   │   │   ├── calculator.py      # Mental Tax (T = Σ(d*w) + δ) calculation logic
│   │   │   ├── optimizer.py       # Scheduling algorithms
│   │   │   └── context.py         # Context Switch (δ) penalty logic
│   │   ├── services/              # External Integrations
│   │   │   ├── ai_service.py      # MongoDB Vector Search & AI embedding integrations
│   │   │   └── db_service.py      # MongoDB Atlas queries and CRUD
│   │   ├── models/                # Pydantic & Domain Models
│   │   │   └── schemas.py         # Pydantic models for request/response validation
│   │   └── core/                  # Configuration
│   │       └── config.py          # Environment variables & constants
│   ├── requirements.txt
│   └── .env                       # Backend secrets (MongoDB, etc.)
│
├── README.md                      # Project introduction
├── PLAN.md                        # This architecture document
└── docker-compose.yml             # Local orchestrated development
```

## 5. Architectural Flow

1. **Task Ingestion**: The User inputs tasks via Next.js (`TaskInput.tsx`). The frontend sends a JSON payload to the FastAPI `/tasks` endpoint.
2. **AI Categorization**: The FastAPI backend receives the task. `ai_service.py` potentially generates a vector embedding of the task description to associate it with an existing category (e.g., categorizing "Write python script" as STEM w=0.9).
3. **Cognitive Load Calculation**: The `calculator.py` engine computes the individual Mental Tax for the newly added task avoiding the frontend having to compute it.
4. **Schedule Optimization**: `optimizer.py` looks at the user's daily capacity. It arranges tasks to minimize unnecessary context switching (saving on the `δ` penalty) while stacking high-focus tasks during peak energy hours.
5. **Data Persistence**: The computed schedule and metrics are saved to MongoDB Atlas by `db_service.py`.
6. **Frontend Rendering**: Next.js fetches the optimized schedule and renders it. The `LoadMeter.tsx` visually shows how close the user is to their daily cognitive maximum limit, purely rendering the data computed by python.
