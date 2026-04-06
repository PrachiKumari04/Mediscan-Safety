const { GoogleGenAI } = require('@google/genai');

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
    if (e.status === 429 || (e.message && e.message.includes('429'))) {
      throw new Error("Google AI Free Tier Limit Reached! Try again in 1 minute, or type the medicines manually.");
    }
    if (e.status === 404) {
      throw new Error("Model not found on this API key. Trying with typing manually.");
    }
    throw new Error("Failed to extract medicines from image. The AI service may be temporarily unavailable.");
  }
}

async function analyzeInteractions(drugData, language = 'English') {
  const getMockData = (errorMessage = "") => {
    const errorStr = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage || "");
    let cleanMessage = "AI service temporarily unavailable. Please try again later.";
    if (errorStr.includes("429") || errorStr.includes("Quota") || errorStr.includes("quota")) {
      cleanMessage = "We are receiving too many requests right now. Please wait 1 minute and try again.";
    }

    return {
      status: "CAUTION",
      summary: cleanMessage,
      alternatives: ["Please consult a doctor"],
      details: drugData.map(d => ({
        medicine: d.name,
        composition: d.composition || "Unknown",
        dosage: "Take as directed",
        warnings: d.warnings || "No major warnings found."
      }))
    };
  };

  if (isMock) {
    return getMockData("No valid GEMINI_API_KEY provided initially");
  }

  // Clean drugData so that "Not found" strings don't confuse the LLM into thinking that's the literal value
  const cleanDrugData = drugData.map(d => {
    const cleanD = { ...d };
    if (typeof cleanD.composition === 'string' && (cleanD.composition.includes("Unknown") || cleanD.composition.includes("Not found") || cleanD.composition.includes("Error"))) delete cleanD.composition;
    if (typeof cleanD.warnings === 'string' && cleanD.warnings.includes("Not found")) delete cleanD.warnings;
    if (typeof cleanD.interactions === 'string' && cleanD.interactions.includes("Not found")) delete cleanD.interactions;
    return cleanD;
  });

  const medicineNames = drugData.map(d => d.name).join(", ");

  const prompt = `You are an expert, friendly pharmacist talking to a patient with no medical background.
  Please analyze the following medicines: ${medicineNames}.
  
  CRITICAL INSTRUCTIONS:
  1. Translate the ENTIRE output into ${language}. Every single property in the JSON (except the status key) must be in ${language}.
  2. Use EXTREMELY SIMPLE language. Explain it like you are talking to a 10-year-old.
  3. DO NOT use big medical jargon, hard words, or complex chemical names if you can avoid it.
  4. Classify overall risk as SAFE / CAUTION / DANGEROUS.
  5. For each medicine give: what it is usually for (composition made simple), simple dosage, simple allergy warnings. 
  6. If risky, explain it very simply and suggest 2-3 common Indian alternatives. Always add a short disclaimer to ask a doctor.
  7. Use your own extensive medical knowledge to provide the composition, dosage, and warnings for each medicine. DO NOT say "I don't know" or "The information provided doesn't say". You know what these medicines are!
  8. Do NOT mention databases, the source of your information, or the fact that data was missing. Just state the facts.
  9. If a medicine name seems misspelled, incomplete, or if you don't recognize it perfectly (often caused by poor handwriting OCR, e.g., 'Paried' instead of 'Paricel'), use your medical intuition to GUESS the most likely intended medicine based on common Indian drugs. Analyze your best guess and briefly mention that you corrected the spelling.
  
  (Optional context): Here is some preliminary database data. Use it if helpful, but override it with your own knowledge if it is empty, incomplete, or incorrect:
  ${JSON.stringify(cleanDrugData, null, 2)}
  
  Return output STRICTLY as this JSON structure. Do NOT wrap in markdown block.
  {
    "status": "SAFE|CAUTION|DANGEROUS",
    "summary": "Plain language explanation in ${language}",
    "alternatives": ["Name 1", "Name 2"],
    "details": [
       { "medicine": "Name", "composition": "...", "dosage": "...", "warnings": "..." }
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (e) {
    console.warn("API Error during Gemini safety check. Falling back to MOCK mode.", e.message);
    return getMockData(e.message);
  }
}

module.exports = { extractFromImage, analyzeInteractions };
