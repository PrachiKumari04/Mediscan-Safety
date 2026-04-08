const { GoogleGenAI } = require('@google/genai');

const isMock = !process.env.GEMINI_API_KEY;
const ai = isMock ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * AI-powered safety analysis using Gemini 2.0 Flash.
 * This is isolated to break circular dependencies.
 */
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

module.exports = { analyzeInteractionsGemini };
