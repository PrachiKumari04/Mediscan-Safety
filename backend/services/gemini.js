/**
 * Mediscan AI Service - Extraction Refinement Engine
 * Last Deployment Build: 2026-04-08T12:08:00Z
 */
const { GoogleGenAI } = require('@google/genai');
const { extractFromImageGroq } = require('./groqVision');
const { extractFromImageLocal } = require('./ocr');

const isMock = !process.env.GEMINI_API_KEY;
const ai = isMock ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Universal normalization helper to ensure we always return a flat array of strings.
 * Handles cases where AI returns { "medicines": [...] } or raw [...]
 */
function normalizeMedicines(data) {
  if (!data) return [];
  
  // If it's already a flat array, just return it
  if (Array.isArray(data)) {
    return data.map(m => (typeof m === 'string' ? m : (m.name || JSON.stringify(m)))).filter(Boolean);
  }
  
  // If it's an object with a medicines/list key
  if (typeof data === 'object') {
    const list = data.medicines || data.list || data.names || Object.values(data).find(Array.isArray);
    if (list && Array.isArray(list)) {
      return normalizeMedicines(list); // Recursive call to clean the inner array
    }
  }
  
  return ["Unknown Medicine"];
}

async function extractFromImage(base64Image, mediaType) {
  if (isMock) return { medicines: ["Paracetamol", "Ibuprofen"], method: "Mock Data" };

  // 1st PRIORITY: Gemini 2.0 Flash (Vision)
  console.log("💎 Attempting Gemini 2.0 Flash Vision...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Upgraded to 2.0 Flash for superior vision and OCR
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Image, mimeType: mediaType } },
            { text: "System: You are an expert medical vision assistant.\nTask: Extract all medicine brand and generic names visible in this image. Return ONLY a JSON array of strings: [\"Name A\", \"Name B\"]. If no medicine is found, return []." }
          ]
        }
      ],
      config: { 
        responseMimeType: "application/json",
        temperature: 0 // Keep it deterministic for extraction
      }
    });
    const rawResult = JSON.parse(response.text);
    const medicines = normalizeMedicines(rawResult);
    console.log(`✅ Gemini Extraction Success: ${medicines.length} found.`);
    return { medicines, method: "Gemini 2.0 Vision" };
  } catch (e) {
    const isQuotaError = e.message?.includes("quota") || e.status === 429;
    console.warn(`⚠️ Step 1 (Gemini) failed: ${isQuotaError ? 'Quota Reached' : e.message}`);

    // 2nd PRIORITY: Groq Vision Fallback
    console.log("🌪️ Step 2: Attempting Groq Vision fallback...");
    try {
      const groqMedicines = await extractFromImageGroq(base64Image, mediaType);
      console.log(`✅ Groq Extraction Success: ${groqMedicines.length} found.`);
      return { 
        medicines: groqMedicines, 
        method: "Groq Vision", 
        warning: "Vision fallback active. Accuracy may vary." 
      };
    } catch (groqError) {
      console.warn("⚠️ Step 2 (Groq) failed:", groqError.message);
      
      // 3rd PRIORITY (The Safety Net): Local OCR + AI Refinement
      console.log("🛡️ Step 3: Resorting to Local OCR + AI Refinement...");
      try {
        const rawOcrText = await extractFromImageLocal(base64Image, mediaType);
        console.log(`📄 Step 3a (OCR) complete (${rawOcrText.length} chars). Refining names...`);
        const refined = await refineOcrResults(rawOcrText);
        console.log(`✅ Step 3b (Refinement) success: ${refined.length} found.`);
        return { 
          medicines: refined, 
          method: "Local OCR", 
          warning: "Regional vision restriction detected. Local OCR fallback active." 
        };
      } catch (ocrError) {
        console.error("❌ Step 3 (OCR) failed:", ocrError.message);
        throw new Error("Unable to extract medicine names. All engines failed.");
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
      model: 'gemini-2.0-flash',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
        temperature: 0.1 
      }
    });
    const result = JSON.parse(response.text);
    return normalizeMedicines(result);
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

module.exports = { extractFromImage };
