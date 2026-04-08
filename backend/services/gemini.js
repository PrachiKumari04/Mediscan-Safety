/**
 * Mediscan AI Service - Extraction Refinement Engine
 * Improved OCR - April 2026
 */

const { GoogleGenAI } = require('@google/genai');
const { extractFromImageGroq } = require('./groqVision');
const { extractFromImageLocal } = require('./ocr');

const isMock = !process.env.GEMINI_API_KEY;
const ai = isMock ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Universal normalization helper
 */
function normalizeMedicines(data) {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map(m => (typeof m === 'string' ? m : (m.name || JSON.stringify(m)))).filter(Boolean);
  }

  if (typeof data === 'object') {
    const list = data.medicines || data.list || data.names || Object.values(data).find(Array.isArray);
    if (list && Array.isArray(list)) {
      return normalizeMedicines(list);
    }
  }

  return ["Unknown Medicine"];
}

const { prepareImageForAI } = require('./image');

function getFriendlyError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("404") || msg.includes("not found")) return "Model not available";
  if (msg.includes("429") || msg.includes("quota")) return "Rate limit / High traffic";
  if (msg.includes("location") || msg.includes("region")) return "Regional restriction";
  return "AI temporarily unavailable";
}

/**
 * STRICT OCR PROMPT - This is the main fix for wrong medicine names
 */
const STRICT_OCR_PROMPT = `
System: You are a highly accurate Medical OCR Auditor.
Task: Identify every medicine name (brand or generic) visible in the provided image.

STRICT RULES - FOLLOW EXACTLY:
1. Read and extract medicine names EXACTLY as printed. Do NOT guess, correct, or invent any name.
2. If text is blurry, partial, or unclear, write it as "unclear: [partial text]".
3. Focus especially on bold/large text (this usually contains the main medicine name).
4. ONLY list medicines that are clearly visible and readable.
5. Extract names as a flat JSON array of strings. 
6. If no medicines are found or the image is unreadable, return [].
7. No additional text, markdown tags, or explanations.
`;

async function extractFromImage(base64Image, mediaType) {
  if (isMock) return { medicines: [], method: "Offline Mode" };

  const optimizedBase64 = await prepareImageForAI(base64Image);
  let lastError = "AI Busy";

  // Priority order: 2.5 → 2.5-latest → 2.0 → Groq → Local
  const modelAttempts = [
    { name: 'gemini-2.5-flash',          label: "Gemini 2.5 Flash" },
    { name: 'gemini-2.5-flash-latest',   label: "Gemini 2.5 Flash Latest" },
    { name: 'gemini-2.0-flash',          label: "Gemini 2.0 Flash" }
  ];

  for (const attempt of modelAttempts) {
    console.log(`💎 Attempting ${attempt.label} Vision...`);
    try {
      const response = await ai.models.generateContent({
        model: attempt.name,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: optimizedBase64, mimeType: 'image/jpeg' } },
              { text: STRICT_OCR_PROMPT }
            ]
          }
        ],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.0 
        }
      });

      const rawResult = JSON.parse(response.text);
      const medicines = normalizeMedicines(rawResult);
      
      console.log(`✅ ${attempt.label} Extraction Success: ${medicines.length} medicines.`);
      return { medicines, method: attempt.label + " Vision" };
    } 
    catch (e) {
      lastError = getFriendlyError(e);
      console.warn(`⚠️ ${attempt.name} failed: ${lastError}`);
      
      // If it's a real 404/model not found or quota, continue to next model
      if (lastError.includes("not available") || lastError.includes("not found") || lastError.includes("limit")) {
        continue;
      }
      break; // For other unexpected errors, stop trying
    }
  }

  // If all Gemini models fail → Groq Vision Fallback
  console.log("🌪️ All Gemini models failed. Trying Groq Vision fallback...");
  try {
    const groqMedicines = await extractFromImageGroq(optimizedBase64, 'image/jpeg');
    console.log(`✅ Groq Extraction Success: ${groqMedicines.length} found.`);
    return { 
      medicines: groqMedicines, 
      method: "Groq Vision", 
      warning: `Gemini unavailable (${lastError})` 
    };
  } catch (groqError) {
    console.warn("⚠️ Groq Vision failed:", groqError.message);
    
    // Final fallback: Local OCR + Refinement
    console.log("🛡️ Using Local OCR + Refinement...");
    try {
      const rawOcrText = await extractFromImageLocal(optimizedBase64, 'image/jpeg');
      const refined = await refineOcrResults(rawOcrText);
      return { 
        medicines: refined, 
        method: "Local OCR + Refinement", 
        warning: `Local extraction active (${lastError})`
      };
    } catch (ocrError) {
      console.error("❌ All extraction methods failed");
      throw new Error(`All extraction methods failed: ${lastError}`);
    }
  }
}

/**
 * Refinement Step - Makes OCR much more accurate
 */
async function refineOcrResults(rawOcrText) {
  if (isMock || !rawOcrText) return [];

  const prompt = `You are a medical OCR corrector.
Raw OCR text from Indian medicine strip: "${rawOcrText}"

Task: Fix only obvious OCR mistakes (e.g. "Paracetmol" → "Paracetamol", "Amoxcillin" → "Amoxicillin").
- Keep original spelling if unsure.
- Do NOT add new medicines that are not in the text.
- Return ONLY a JSON array of corrected medicine names.

Return format: ["Corrected Name 1", "Corrected Name 2"]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const result = JSON.parse(response.text);
    return normalizeMedicines(result);
  } catch (e) {
    console.warn("⚠️ Gemini refinement failed, trying Groq...");
    return await refineOcrResultsGroq(rawOcrText);
  }
}

async function refineOcrResultsGroq(rawOcrText) {
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Fix obvious OCR errors in this medicine strip text.
Text: "${rawOcrText}"

Return ONLY a JSON array of corrected medicine names. Do not add extra medicines.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = JSON.parse(completion.choices[0].message.content);
  return Array.isArray(content) ? content : (content.medicines || content.names || ["Unknown Medicine"]);
}

module.exports = { extractFromImage };