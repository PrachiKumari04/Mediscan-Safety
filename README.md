# 🩺 Mediscan Safety Checker

<div align="center">
  <p><strong>An advanced, AI-powered medicine interaction and safety checker designed to make medical information accessible, readable, and incredibly simple.</strong></p>

  <h3>🚀 <a href="https://mediscan-safety.vercel.app/">Try the Live Demo Here!</a></h3>
</div>

---

## 🌟 Overview

Mediscan Safety Checker is an intelligent healthcare companion application. It allows users to input medicine names using **images**, **voice**, or **text**, fetches the standardized drug compositions and allergy/warning profiles directly from public health databases (NIH RxNav & openFDA), and uses **Google Gemini 2.5 Flash** to perform intelligent interaction analysis.

The defining feature of this project is its focus on **Accessibility & Simplicity**. Complex medical jargons are distilled into easily understandable language (like you'd explain to a 10-year-old) and outputted across multiple regional languages (English, Hindi, Marathi, Tamil) with text-to-speech capabilities.

## ✨ Key Features

### 📸 OCR Prescription & Image Scanning
- Upload images of **doctor's handwritten notes**, medicine strips, or pill bottles.
- Powered by optical character recognition (OCR) via Google Gemini Vision API to instantly scan, crop, and convert medicine branding into digital text.

### 🎤 Voice & Manual Input
- Native browser speech-to-text integration allowing users to simply speak the names of their medicines.
- Simple manual entry system for power users.

### 🛡️ Real-time Safety Analytics
- Concurrently pings the **RxNav API** (National Institutes of Health) to parse the chemical constituents of brand-name drugs.
- Concurrently pings the **openFDA API** to aggregate critical boxed warnings and known drug-drug interactions.

### 🧠 Google Gemini AI Reasoning
- Replaces generic interaction checkers with contextual AI analysis.
- Classifies medication combinations into three tiers: **SAFE**, **CAUTION**, or **DANGEROUS**.
- Suggests 2-3 common local (Indian) medication alternatives if a conflict is spotted.

### 🔊 Multilingual Text-to-Speech (TTS)
- Translates the highly complex medical output into simplified regional languages.
- Complete with play, pause, and stop audio controls for visually challenged or elderly users.

---

## 🛠️ Technology Stack

**Frontend:**
- **React.js** + **Vite** (for lightning-fast HMR and building)
- **Vanilla CSS** (Custom clinical white, blue, and green color palette implementing a glassmorphism design system)
- **Lucide React** (for crisp, clean clinical iconography)
- **Axios** (for API communication)

**Backend:**
- **Node.js** + **Express.js** 
- **Multer** (For handling multipart/form-data image uploads in-memory)
- **@google/genai** (Official Google generative AI SDK for multimodal operations)
- **Axios** (For external HTTP requests to FDA and NIH APIs)

---

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v16.0 or higher recommended)
- A free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 1. Clone & Backend Setup
Navigate into the backend directory and install the necessary dependencies:

```bash
cd backend
npm install
```

Configure your environment variables carefully:
1. Create a `.env` file in the root of the `backend` folder.
2. Add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_google_gemini_api_key_here
PORT=5000
```

Start the backend orchestration server:
```bash
node server.js
```
*The server should successfully boot up on `http://localhost:5000`.*

### 2. Frontend Setup
Open a **new terminal window/tab**, navigate to the frontend directory, and install dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

*Your frontend will typically be accessible at `http://localhost:5173/`.*

---

## 📚 API Reference (Internal)

If you'd like to extend the backend, here are the core endpoints exposed by Express:

### `POST /api/extract-medicines`
Accepts a `multipart/form-data` payload containing an `image` file.
- **Returns:** A JSON array of extracted medicine names.
- **Mechanism:** Forwards the image buffer to Gemini Vision.

### `POST /api/check-safety`
Accepts a JSON payload:
```json
{
  "medicines": ["Paracetamol", "Ibuprofen"],
  "language": "Hindi"
}
```
- **Returns:** A standardized safety JSON payload including status, translated summary, alternatives, and a detailed breakdown.
- **Mechanism:** Aggregates RxNav + FDA data and prompts the text model.

---

## ⚠️ Disclaimer
**This application is a Proof of Concept (POC) designed for demonstration and informational purposes only.** The AI-generated interactions and summaries are not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified physician or pharmacist before making any changes to your medication regimen.


