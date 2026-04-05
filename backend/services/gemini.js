const { GoogleGenAI } = require('@google/genai');

const isMock = !process.env.GEMINI_API_KEY;
const ai = isMock ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractFromImage(base64Image, mediaType) {
  if (isMock) {
    return ["Paracetamol", "Ibuprofen"]; // Default fallback
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
  } catch(e) {
    console.warn("API Error during Gemini image extraction. Falling back to MOCK mode.", e.message);
    return ["Glimepiride", "Metformin"];
  }
}

async function analyzeInteractions(drugData, language = 'English') {
  const getMockData = (errorMessage = "") => {
    let cleanMessage = "Based on basic mock logic, these medicines might interact. (API Error)";
    if (errorMessage.includes("429") || errorMessage.includes("Quota") || errorMessage.includes("quota")) {
      cleanMessage = "We are receiving too many requests right now. Please wait 1 minute and try again.";
    } else if (errorMessage) {
      cleanMessage = "AI service temporarily unavailable. Please try again later.";
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
  Analyze these medicines for interactions based on the openFDA data provided:
  ${JSON.stringify(drugData, null, 2)}
  
  CRITICAL INSTRUCTIONS:
  1. Translate the ENTIRE output into ${language}. Every single property in the JSON (except the status key) must be in ${language}.
  2. Use EXTREMELY SIMPLE language. Explain it like you are talking to a 10-year-old.
  3. DO NOT use big medical jargon, hard words, or complex chemical names if you can avoid it.
  4. Classify overall risk as SAFE / CAUTION / DANGEROUS.
  5. For each medicine give: what it is usually for (composition made simple), simple dosage, simple allergy warnings. 
  6. If risky, explain it very simply and suggest 2-3 common Indian alternatives. Always add a short disclaimer to ask a doctor.
  
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
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch(e) {
     console.warn("API Error during Gemini safety check. Falling back to MOCK mode.", e.message);
     return getMockData(e.message);
  }
}

module.exports = { extractFromImage, analyzeInteractions };
