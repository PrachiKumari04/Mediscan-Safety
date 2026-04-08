const { GoogleGenAI } = require('@google/genai');
const { extractFromImageGroq } = require('./groqVision');
const { extractFromImageLocal } = require('./ocr');

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
    console.warn("⚠️ API Error during Gemini image extraction:");
    console.error({
      status: e.status,
      message: e.message
    });
    
    // FAIL-SAFE 1: If Gemini is overloaded (429) or down (500/503), OR location restricted (400)
    // Try Groq Vision
    console.log("🔄 Attempting Groq Vision fallback...");
    try {
      const groqMedicines = await extractFromImageGroq(base64Image, mediaType);
      console.log("✅ Groq fallback extraction successful:", groqMedicines);
      return groqMedicines;
    } catch (groqError) {
      console.warn("⚠️ Groq fallback also failed or unavailable:", groqError.message);
      
      // FAIL-SAFE 2: Local OCR (Works without Internet/Location restrictions)
      console.log("🔄 Attempting Local OCR fallback (Tesseract)...");
      try {
        const rawOcrText = await extractFromImageLocal(base64Image, mediaType);
        console.log("📄 Raw OCR Text received. Refining with AI...");
        const refinedMedicines = await refineOcrResults(rawOcrText);
        console.log("✅ Refined OCR extraction successful:", refinedMedicines);
        return refinedMedicines;
      } catch (ocrError) {
        console.error("❌ All extraction methods failed:", ocrError.message);
        throw new Error("Medicine extraction failed. Please type names manually.");
      }
    }
  }
}

async function refineOcrResults(rawTextLines) {
  if (isMock) return rawTextLines;
  
  const rawText = Array.isArray(rawTextLines) ? rawTextLines.join(", ") : rawTextLines;
  const prompt = `You are a medical data cleaner. I have raw, noisy OCR text from a medicine bottle: "${rawText}".
  TASK: Identify and return only the specific medicine brand or generic names (e.g., 'Paracetamol', 'Lipitor').
  STRICT RULES:
  1. Fix obvious OCR typos.
  2. REMOVE and IGNORE noise: "500MG", "DATE", "EXPIRY", "TABLET", "QTY", "MFG".
  3. REMOVE and IGNORE classifications: "ANTIPYRETIC", "ANALGESIC", "ANTIBIOTIC".
  4. REMOVE and IGNORE fragments like "PANO", "OMG", "ESIC" unless they are part of a valid name.
  5. If no valid medicine name is found, return ["Unknown Medicine"].
  Return the result as a JSON array of strings: ["Medicine A", "Medicine B"].`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Use 1.5-flash for reliability/speed in text tasks
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Refinement Error:", e.message);
    // If refinement fails, return the original noisy text rather than failing entirely,
    // but filter it slightly to avoid extreme junk.
    return (Array.isArray(rawTextLines) ? rawTextLines : [rawTextLines]).slice(0, 5);
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
