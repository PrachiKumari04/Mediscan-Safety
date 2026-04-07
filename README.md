# 🩺 Mediscan Safety Checker

<div align="center">
  <p><strong>An advanced, AI-powered medicine interaction and safety checker designed to make medical information accessible, readable, and incredibly simple.</strong></p>

  <h3>🚀 <a href="https://mediscan-safety.vercel.app/">Try the Live Demo Here!</a></h3>
</div>

---

## 🌟 Overview (Dual-Engine Approach)

Mediscan Safety Checker is an intelligent healthcare companion application. To ensure maximum reliability and stay within free-tier limits, this project uses a **Dual-Engine AI architecture**:

1.  **Vision Engine (Google Gemini 2.0 Flash)**: Specialized in reading handwritten prescriptions, medicine strips, and pill packets with high accuracy.
2.  **Reasoning Engine (Groq / Llama-3.3-70B)**: An ultra-fast text model that performs deep safety analysis, simplifies medical jargon, and handles multi-language translations instantly.

By splitting the workload, Mediscan provides a resilient, high-speed experience while minimizing API rate-limit pressure.

## ✨ Key Features

### 📸 OCR Prescription & Image Scanning
- Upload images of **doctor's handwritten notes**, medicine strips, or pill bottles.
- Powered by **Google Gemini 2.0 Flash** to instantly scan and extract medicine names into digital text.

### 🎤 Voice & Manual Input
- Native browser speech-to-text integration for hands-free entry.
- Simple manual entry system for power users.

### 🛡️ Real-time Safety Analytics
- Concurrently pings the **RxNav API** (National Institutes of Health) to parse chemical constituents.
- Concurrently pings the **openFDA API** to aggregate critical boxed warnings and interactions.

### 🧠 Groq-Powered Safety Reasoning
- Uses **Llama-3.3-70B-Versatile** via Groq to analyze complex drug-drug interactions.
- Classifies medication combinations into: **SAFE**, **CAUTION**, or **DANGEROUS**.
- Suggests 2-3 common local (Indian) medication alternatives if a conflict is spotted.

### 🔊 Multilingual Text-to-Speech (TTS)
- Translates medical output into simplified regional languages (**English, Hindi, Marathi, Tamil**).
- Complete with play, pause, and stop audio controls for accessibility.

---

## 🛠️ Technology Stack

**Frontend:**
- **React.js** + **Vite**
- **Vanilla CSS** (Glassmorphism design system)
- **Lucide React** (Clinical iconography)

**Backend:**
- **Node.js** + **Express.js** 
- **@google/genai** (Gemini Vision)
- **groq-sdk** (Llama-3.3 Reasoning)
- **Axios** (FDA and NIH API communication)

---

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v16.0 or higher)
- A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
- A **Groq API Key** from [Groq Console](https://console.groq.com/).

### 1. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
GEMINI_API_KEY=your_google_gemini_key
GROQ_API_KEY=your_groq_key
PORT=5000
```

**Verify the Integration:**
Run the dual-engine test script to ensure both AI providers are configured correctly:
```bash
node test-dual-engine.js
```

Start the server:
```bash
node server.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📚 API Reference (Internal)

### `POST /api/extract-medicines`
- **Engine:** Google Gemini 2.0 Flash
- **Returns:** JSON array of extracted medicine names.

### `POST /api/check-safety`
- **Engine:** Groq (Llama-3.3-70B)
- **Mechanism:** Aggregates RxNav + FDA data and prompts the reasoning model for a simplified safety report.

---

## ⚠️ Disclaimer
**This application is a Proof of Concept (POC) designed for demonstration purposes only.** AI-generated interactions are NOT a substitute for professional medical advice. Always consult a qualified physician or pharmacist before changing your medication.


