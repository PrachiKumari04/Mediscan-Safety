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

  const prompt = `You are a friendly pharmacist talking to someone with no medical background.
  Analyze these medicines for interactions. Use the provided openFDA data if available, but if any information is missing (like composition, dosage, or warnings), use your own medical knowledge to fill in the gaps:
  ${JSON.stringify(drugData, null, 2)}
  
  CRITICAL INSTRUCTIONS:
  1. Translate the ENTIRE output into ${language}. Every single property in the JSON (except the status key) must be in ${language}.
  2. Use EXTREMELY SIMPLE language. Explain it like you are talking to a 10-year-old.
  3. DO NOT use big medical jargon, hard words, or complex chemical names if you can avoid it.
  4. Classify overall risk as SAFE / CAUTION / DANGEROUS.
  5. For each medicine give: what it is usually for (composition made simple), simple dosage, simple allergy warnings. 
  6. If risky, explain it very simply and suggest 2-3 common Indian alternatives. Always add a short disclaimer to ask a doctor.
  7. Do NOT explicitly state that data was missing from openFDA. Just provide the expected details using your own knowledge.
  
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
