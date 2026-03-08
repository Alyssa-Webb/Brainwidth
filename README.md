# Brainwidth: Cognitive Load Scheduler

Developed within 24hours of HACKCU12 2026, **Brainwidth** is a smart scheduling ecosystem designed to transform time management into **Energy Management**. Typical tools like Google Calendar and Outlook only provide linear time blocks, completely ignoring the "Mental Tax" of switching between a high-focus Calculus assignment and a tedious work meeting.

---
## Run Locally
In order to run locally, a MONGO_URI and GEMINI_API_KEY are required.

   cd frontend
   npm run dev

   cd backend
   source venv/bin/activate
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

   View the site as http://localhost:3000, and see tool-tip to the left to the scheduling dashboard after creating an account.

---

## What It Does

With Brainwidth, your schedule is built around *you*. 

* **Chronotype Quiz:** Users create a unique profile (Lion, Bear, Dolphin, or Wolf) by taking an assessment that maps their natural sleep patterns, energy levels, and productivity habits.
* **Syllabus Parsing:** Upload your course syllabi, and our AI agent (Gemini) evaluates the text to determine the cognitive load required for the course.
* **Smart Scheduling:** Whether you are uploading a new syllabus, scheduling tasks for the week, or retaking the chronotype quiz, Brainwidth automatically schedules the absolute best times of day to get your work done productively and healthily.

---

## How We Built It

We utilized a high-performance modern tech stack to handle complex data parsing and real-time scheduling:

* **Google Gemini API:** The core engine for unstructured data extraction and RAG-based syllabus analysis.
* **Next.js & Tailwind CSS:** For a sleek, responsive frontend that visually maps cognitive load.
* **Python (Flask/FastAPI):** Handling the algorithmic logic for the "Mental Tax" and data processing.
* **MongoDB Atlas:** To securely store complex, nested user profiles and evolving "Chronotype" data.
* **Antigravity IDE:** Our primary environment, necessary for prompt-engineering and seamless collaboration.
* **GitHub:** Vital for version control and coordinating our team's workflow.

---

## Challenges We Ran Into

* **Navigating Prompt-Driven Development:** Learning to build a full-stack application within the Antigravity IDE required a massive shift in our workflow. We had to adapt to "prompt-driven" programming, coordinating the work we'd get done using our respective AI agents.
* **Managing Gemini API Limits:** As we fed complex, multi-page syllabus PDFs into Gemini, we quickly hit rate-limiting bottlenecks. We learned how to optimize our prompt payloads, structure asynchronous requests, and handle API constraints gracefully to ensure the app didn't crash during heavy extraction.
* **Local Google Calendar Integration:** Linking a user's real Google Calendar locally proved very tricky. We had to navigate the strict intricacies of Google's OAuth 2.0 flow, securely manage access tokens, and ensure our `localhost` environment could authenticate and fetch live events without exposing credentials.

---

## Accomplishments That We're Proud Of

* **It's Functional!:** As our very first Hackathon, it was a blast coming up with ideas and tackling our chosen track head-on. We are incredibly grateful to have had the time to attend and actually build something real.
* **Mastering New Technologies:** Being introduced to modern tools like Google's Antigravity caused a huge, positive shift in our project. Getting this exposure made a significant impact on our understanding of current tech and how to rapidly speed up our workflow in the future.

---

## What We Learned

As a team, we learned how to navigate prompt engineering to solve a deeply personal problem in our community. Hyma’s experience as a Residential Advisor (RA) allowed her to see the stress of incoming students firsthand, recognizing how difficult it is to manage a schedule amidst academic pressure. For Alyssa, this project opened exciting new avenues for how our team can continue developing projects geared toward genuine social impact.

---

## What's Next for Brainwidth

We have several exciting implementations planned for the future:
* **Expanded Research:** Incorporating more peer-reviewed, research-backed data to refine our weighting algorithms.
* **Biometric Integration:** Using real-time user data from wearables to adjust schedules based on live sleep and recovery metrics.
* **Beyond the University:** Expanding our audience to high school students and corporate professionals to reinforce healthy planning habits and reduce burnout across all high-stress industries.
