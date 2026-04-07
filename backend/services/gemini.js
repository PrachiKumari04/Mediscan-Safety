const { GoogleGenAI } = require('@google/genai');
const { extractFromImageGroq } = require('./groqVision');

const isMock = !process.env.GEMINI_API_KEY;
const ai = isMock ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractFromImage(base64Image, mediaType) {
  if (isMock) {
    return ["Paracetamol", "Ibuprofen"]; // Default fallback only if no API key
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Image, mimeType: mediaType } },
            { text: "Extract all medicine brand and generic names from this photo of tablet, strip, or handwritten prescription. Return exact JSON array of strings e.g. [\"Medicine A\", \"Medicine B\"]." }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (e) {
    console.warn("API Error during Gemini image extraction.", e.status, e.message);
    
    // FAIL-SAFE: If Gemini is overloaded (429) or down (500/503), switch to Groq Vision!
    if (e.status === 429 || e.status >= 500 || (e.message && (e.message.includes('429') || e.message.includes('503')))) {
      console.log("🔄 Gemini limit reached/unavailable. Switching to Groq Vision fallback...");
      try {
        return await extractFromImageGroq(base64Image, mediaType);
      } catch (groqError) {
        throw new Error("Both Gemini and Groq Vision are currently unavailable. Please type medicines manually.");
      }
    }
    
    if (e.status === 404) {
      throw new Error("Model not found on this API key. Trying with typing manually.");
    }
    throw new Error("Failed to extract medicines. The AI service may be temporarily unavailable.");
  }
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
