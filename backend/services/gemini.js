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

module.exports = { extractFromImage };
