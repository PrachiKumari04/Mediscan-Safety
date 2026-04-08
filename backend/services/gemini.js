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

const { prepareImageForAI } = require('./image');

function getFriendlyError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("404") || msg.includes("not found")) return "AI model update in progress";
  if (msg.includes("429") || msg.includes("quota")) return "AI busy (High traffic)";
  if (msg.includes("location") || msg.includes("region")) return "Regional restriction active";
  return "AI temporarily unavailable";
}

async function extractFromImage(base64Image, mediaType) {
  if (isMock) return { medicines: [], method: "Offline Mode" };

  // OPTIMIZATION: Compress and sharpen image before sending to any API
  const optimizedBase64 = await prepareImageForAI(base64Image);
  let lastError = "AI Busy";

  // 1st PRIORITY: Gemini 2.0 Flash (Vision)
  console.log("💎 Attempting Gemini 2.0 Flash Vision...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: optimizedBase64, mimeType: 'image/jpeg' } },
            { text: "Extract medicine names. Return ONLY a JSON array." }
          ]
        }
      ],
      config: { 
        responseMimeType: "application/json",
        temperature: 0 
      }
    });

    if (response) {
      const rawResult = JSON.parse(response.text);
      const medicines = normalizeMedicines(rawResult);
      console.log(`✅ Gemini 2.0 Extraction Success: ${medicines.length} found.`);
      return { medicines, method: "Gemini 2.0 Vision" };
    }
  } catch (e) {
    lastError = getFriendlyError(e);
    console.warn(`⚠️ Step 1 (Gemini 2.0) failed: ${lastError}`);

    // OPTIONAL: Try Gemini 1.5 Flash
    console.log("💎 Step 1.5: Attempting Gemini 1.5 Flash...");
    try {
      // NOTE: Attempting standard ID first, fallback to stable alias if 404 occurs
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: optimizedBase64, mimeType: 'image/jpeg' } },
              { text: "Extract medicine names. Return ONLY a JSON array." }
            ]
          }
        ],
        config: { 
          responseMimeType: "application/json",
          temperature: 0 
        }
      });
      const rawResult = JSON.parse(response.text);
      const medicines = normalizeMedicines(rawResult);
      console.log(`✅ Gemini 1.5 Extraction Success: ${medicines.length} found.`);
      return { medicines, method: "Gemini 1.5 Vision" };
    } catch (e15) {
      lastError = getFriendlyError(e15);
      console.warn("⚠️ Step 1.5 (Gemini 1.5) also failed:", lastError);
    }

    // 2nd PRIORITY: Groq Vision Fallback
    console.log("🌪️ Step 2: Attempting Groq Vision fallback...");
    try {
      const groqMedicines = await extractFromImageGroq(optimizedBase64, 'image/jpeg');
      console.log(`✅ Groq Extraction Success: ${groqMedicines.length} found.`);
      return { 
        medicines: groqMedicines, 
        method: "Groq Vision", 
        warning: `Using backup AI (${lastError})`
      };
    } catch (groqError) {
      console.warn("⚠️ Step 2 (Groq) failed:", groqError.message);
      
      // 3rd PRIORITY: Local OCR
      console.log("🛡️ Step 3: Resorting to Local OCR...");
      try {
        const rawOcrText = await extractFromImageLocal(optimizedBase64, 'image/jpeg');
        const refined = await refineOcrResults(rawOcrText);
        return { 
          medicines: refined, 
          method: "Local OCR", 
          warning: `Local extraction active (${lastError})`
        };
      } catch (ocrError) {
        throw new Error(lastError);
      }
    }
  }
}

const { analyzeInteractionsGroq } = require('./groq');

async function refineOcrResults(rawOcrText) {
  if (isMock) return [];
  
  const prompt = `System: You are an expert medical OCR auditor.
  Task: Identify specific medicine names from this raw OCR text.
  
  OCR DATA:
  "${rawOcrText}"
  
  RULES:
  1. ONLY identify medicines that strictly match the text fragments.
  2. DO NOT invent or guess common medicines (e.g., Metformin, Insulin) unless they are clearly visible in the text.
  3. If the text is pure noise or unreadable, return [].
  4. Return ONLY a flat JSON array of strings: ["Name 1", "Name 2"].`;

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
  
  const prompt = `System: You are an expert medical OCR auditor.
  Task: Identify specific medicine names from this noisy text.
  
  Instruction: 
  - ONLY extract names that you are 90% sure are present. 
  - DO NOT invent or guess common medicines if the text is unreadable.
  - Return ONLY a JSON array of strings.
  
  Text: "${rawOcrText}"`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = JSON.parse(completion.choices[0].message.content);
  return Array.isArray(content) ? content : (content.medicines || ["Unknown Medicine"]);
}

module.exports = { extractFromImage };
