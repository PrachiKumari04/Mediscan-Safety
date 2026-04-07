# 🩺 Mediscan Safety Checker
> **Intelligent Medicine Companion powered by Dual-Engine AI.**

<div align="center">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Powered%20By-Gemini%20%26%20Groq-blue.svg?style=flat-square" alt="Powered By Gemini & Groq">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License MIT">
</div>

---

## 🌟 The "Dual-Engine" Innovation
Mediscan is built on a high-availability **Dual-Engine architecture** that eliminates API bottle-necks and ensures professional-grade medical reasoning.

```mermaid
graph TD
    A[User Input: Photo/Voice/Text] --> B{Task Distributor}
    B -->|Vision Task| C[Google Gemini 2.0 Flash]
    B -->|Reasoning Task| D[Groq: Llama-3.3-70B]
    C -->|Drug Names| E[Mediscan Core]
    D -->|Safety Analysis| E
    E --> F[Standardized NIH/FDA Data]
    F --> G[Final Patient-Friendly Report]
```

### 🧠 Why This Matters?
By splitting **Vision** and **Reasoning**, we achieve:
*   **High Resilience**: If one provider (Gemini) hits its free-tier limit, the other (Groq) continues to provide safety checks.
*   **Lightning Speed**: Groq generates detailed text analysis in milliseconds, while Gemini focuses exclusively on the complex task of OCR.

---

## ✨ Key Features

### 📸 Pro-Grade OCR Scanning
*   **Gemini 2.0 Flash Vision**: Deciphers messy doctor handwriting, blurry medicine strips, and complex labels.
*   **Automatic Extraction**: Converts any photo into a clean list of medicines instantly.

### 🛡️ Deep Safety Analytics
*   **Live Database Connection**: Pings **RxNav** (NIH) and **openFDA** for real-time drug composition and boxed warnings.
*   **Llama-3.3 Reasoning**: Analyzes drug-drug interactions with the medical intuition of a trained pharmacist.

### 🌐 Patient-Centric Design
*   **Simplicity first**: Explains complex pharmacology in "10-year-old" language.
*   **Multilingual Support**: Available in **English, Hindi, Marathi, and Tamil**.
*   **Accessibility**: Built-in **Text-to-Speech (TTS)** with play/pause/stop controls for elderly or visually impaired users.

### 🇮🇳 Indian Context Localization
*   **Local Alternatives**: Suggests 2-3 common Indian medication alternatives if a conflict is detected.
*   **Self-Correction**: Automatically corrects misspelled medicine names using medical context.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Blazing fast HMR and optimized builds. |
| **Styling** | Vanilla CSS | Custom Glassmorphism clinical theme. |
| **Vision AI** | Gemini 2.0 Flash | Best-in-class vision for OCR and image reading. |
| **Reasoning AI** | Groq (Llama-3.3) | State-of-the-art token throughput and speed. |
| **Logic** | Node.js + Express | Orchestrates AI and external medical APIs. |

---

## 🚀 Speed Run Setup

### 1. Requirements
*   A **Google Gemini Key** ([Google AI Studio](https://aistudio.google.com/app/apikey))
*   A **Groq API Key** ([Groq Console](https://console.groq.com/))

### 2. Quick Install
```bash
# Clone and install backend
cd backend && npm install

# Clone and install frontend
cd ../frontend && npm install
```

### 3. Configure `.env`
Create a `.env` in the `backend/` folder:
```env
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
```

### 4. Verify & Launch
Run the **Dual-Engine Test** to ensure everything is working:
```bash
node backend/test-dual-engine.js
```
Then start both servers with `npm run dev` in their respective folders.

---

## ⚠️ Disclaimer
**For Informational Purposes Only.** Mediscan is an AI Proof of Concept (POC). **NEVER** use this as a substitute for professional medical advice. Always consult a doctor before taking any medication.


