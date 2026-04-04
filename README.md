# Mediscan Safety Checker

Mediscan Safety is an AI-powered medicine interaction and safety checker. It extracts medicine names from strip images or voice inputs, fetches standard composition and warnings from healthcare APIs, and leverages Google Gemini to detect dangerous interactions and suggest simple Indian alternatives.

## Features
- **📸 Smart Vision Upload:** Upload medicine strips or handwritten prescriptions to instantly extract the medicine names.
- **🎤 Native Voice Input:** Native browser speech-to-text to simply speak the medicine names.
- **🛡️ Safety Analytics:** Automatically aggregates composition and warnings directly from the public **RxNav** (NIH) and **openFDA** label database APIs.
- **🧠 AI Reasoning:** Leverages **Google Gemini 2.5 Flash** to analyze interactions, highlight risks, and suggest simple, local alternatives.
- **🔊 Multilingual Audio Output:** Translates advice into extremely simple, jargon-free language (Hindi, Marathi, English, Tamil) and speaks it out loud with advanced Pause/Resume playback controls.

## Project Structure
- `frontend/` - A sleek, clinical White & Blue UI built with React + Vite. Fully responsive with glassmorphic cards.
- `backend/` - A fast Node/Express server acting as the orchestrator to ping NIH, FDA, and Google GenAI APIs concurrently.

## Setup Instructions

### 1. Backend Setup
1. Open the `backend` folder: `cd backend`
2. Install dependencies: `npm install`
3. Generate a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
4. Paste the API key into the `.env` file (e.g., `GEMINI_API_KEY=your_actual_api_key_here`). 
5. Start the backend server: `node server.js` (runs on Port 5000)

### 2. Frontend Setup
1. In a new terminal, open the `frontend` folder: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

Open your browser to `http://localhost:5173/` and start checking medicines safely!
