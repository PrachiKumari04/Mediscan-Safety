/**
 * Mediscan AI Service - Extraction Refinement Engine
 * Last Deployment Build: 2026-04-08T12:08:00Z
 */
const { GoogleGenAI } = require('@google/genai');
const { extractFromImageGroq } = require('./groqVision');
const { extractFromImageLocal } = require('./ocr');

const isMock = !process.env.GEMINI_API_KEY;
const ai = isMock ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractFromImage(base64Image, mediaType) {
  if (isMock) return { medicines: ["Paracetamol", "Ibuprofen"], method: "Mock Data" };

  // 1st PRIORITY: Gemini 2.0 Flash (Vision)
  console.log("💎 Attempting Gemini 2.0 Flash Vision...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Note: Increased compatibility for vision tasks
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Image, mimeType: mediaType } },
            { text: "Extract all medicine brand and generic names. Return exactly JSON array of strings: [\"Name A\", \"Name B\"]." }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });
    return { medicines: JSON.parse(response.text), method: "Gemini Vision" };
  } catch (e) {
    console.warn("⚠️ Gemini Vision failed:", e.message);
    const isLocationError = e.message?.includes("location") || e.status === 400;
    const isQuotaError = e.message?.includes("quota") || e.status === 429;

    if (isQuotaError) {
      throw new Error("Gemini API limit reached. Please wait 60s.");
    }

    // 2nd PRIORITY: Groq Vision Fallback
    console.log("🌪️ Attempting Groq Vision fallback...");
    try {
      const groqMedicines = await extractFromImageGroq(base64Image, mediaType);
      return { 
        medicines: groqMedicines, 
        method: "Groq Vision", 
        warning: "Vision fallback active. Accuracy may vary." 
      };
    } catch (groqError) {
      console.warn("⚠️ Groq Vision also failed.");
      
      // 3rd PRIORITY (The Safety Net): Local OCR + AI Refinement
      console.log("🛡️ Resorting to Local OCR + AI Refinement...");
      try {
        const rawOcrText = await extractFromImageLocal(base64Image, mediaType);
        const refined = await refineOcrResults(rawOcrText);
        return { 
          medicines: refined, 
          method: "Local OCR", 
          warning: "Regional vision restriction detected. Local OCR fallback active." 
        };
      } catch (ocrError) {
        console.error("❌ All extraction methods failed.");
        throw new Error("Unable to extract medicine names. Please type them manually.");
      }
    }
  }
}

const { analyzeInteractionsGroq } = require('./groq');

async function refineOcrResults(rawOcrText) {
  if (isMock) return ["Paracetamol"];
  
  const prompt = `You are a specialized medical OCR correction assistant. 
  I have raw, messy OCR text from a medicine bottle:
  ---
  ${rawOcrText}
  ---
  TASK: 
  1. Identify any likely medicine brand or generic names.
  2. Use your medical knowledge to "unscramble" noisy fragments. 
     (Example: If you see "MIE" near "850mg", it is likely "METFORMIN").
     (Example: If you see "P4R4C3TAM0L", it is "PARACETAMOL").
  3. Ignore pure noise like barcodes, dates, or manufacturer addresses.
  4. Return a JSON array of strings: ["Name 1", "Name 2"].
  5. If no real medicine name can be confidently inferred, return ["Unknown Medicine"].`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.warn("⚠️ Gemini Refinement failed, trying Groq fallback...");
    try {
      return await refineOcrResultsGroq(rawOcrText);
    } catch (groqErr) {
      console.error("❌ All refinement methods failed.");
      return ["Unknown Medicine"];
    }
  }
}

async function refineOcrResultsGroq(rawOcrText) {
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `Based on this noisy medical OCR text, identify the specific medicine names. 
  Unscramble errors (e.g., MIE -> METFORMIN). 
  Text: "${rawOcrText}"
  Return ONLY a JSON array of strings.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = JSON.parse(completion.choices[0].message.content);
  return Array.isArray(content) ? content : (content.medicines || ["Unknown Medicine"]);
}

async function analyzeInteractionsGemini(drugData, language = 'English') {
  if (isMock) throw new Error("Mock Mode: API Key missing");

  const medicineNames = drugData.map(d => d.name).join(", ");
  const prompt = `You are an expert, friendly pharmacist. Analyze: ${medicineNames}.
  Language: ${language}. Return JSON: { "status": "SAFE|CAUTION|DANGEROUS", "summary": "plain explanation", "alternatives": [], "details": [] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Gemini Analysis Fallback Error:", e.message);
    throw e;
  }
}

module.exports = { extractFromImage, analyzeInteractionsGemini };
