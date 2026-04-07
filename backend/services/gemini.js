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
    
    // Default English strings
    let cleanMessage = "AI service temporarily unavailable. Please try again later.";
    let consultDoctor = "Please consult a doctor";
    let takeAsDirected = "Take as directed";
    let unknownComp = "Unknown";
    let noWarnings = "No major warnings found.";

    if (errorStr.includes("429") || errorStr.includes("Quota") || errorStr.includes("quota")) {
      cleanMessage = "We are receiving too many requests right now. Please wait 1 minute and try again.";
    }

    if (language === 'Hindi') {
      cleanMessage = (errorStr.includes("429") || errorStr.includes("quota")) ? "अभी बहुत अधिक अनुरोध आ रहे हैं। कृपया 1 मिनट प्रतीक्षा करें और फिर से प्रयास करें।" : "AI सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।";
      consultDoctor = "कृपया डॉक्टर से सलाह लें";
      takeAsDirected = "निर्देशानुसार लें";
      unknownComp = "अज्ञात";
      noWarnings = "कोई बड़ी चेतावनी नहीं मिली।";
    } else if (language === 'Marathi') {
      cleanMessage = (errorStr.includes("429") || errorStr.includes("quota")) ? "सध्या खूप विनंत्या येत आहेत. कृपया १ मिनिट प्रतीक्षा करा आणि पुन्हा प्रयत्न करा." : "AI सेवा तात्पुरती अनुपलब्ध आहे. कृपया नंतर पुन्हा प्रयत्न करा.";
      consultDoctor = "कृपया डॉक्टरांचा सल्ला घ्या";
      takeAsDirected = "निर्देशानुसार घ्या";
      unknownComp = "अज्ञात";
      noWarnings = "कोणतेही मोठे इशारे आढळले नाहीत.";
    } else if (language === 'Tamil') {
      cleanMessage = (errorStr.includes("429") || errorStr.includes("quota")) ? "தற்போது பல கோரிக்கைகள் வருகின்றன. 1 நிமிடம் காத்திருந்து மீண்டும் முயற்சிக்கவும்." : "AI சேவை தற்காலிகமாக கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.";
      consultDoctor = "தயவுசெய்து மருத்துவரை அணுகவும்";
      takeAsDirected = "இயக்கப்பட்டபடி எடுக்கவும்";
      unknownComp = "தெரியவில்லை";
      noWarnings = "பெரிய எச்சரிக்கைகள் எதுவும் கிடைக்கவில்லை.";
    }

    return {
      status: "CAUTION",
      summary: cleanMessage,
      alternatives: [consultDoctor],
      details: drugData.map(d => ({
        medicine: d.name,
        composition: d.composition || unknownComp,
        dosage: takeAsDirected,
        warnings: d.warnings || noWarnings
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

    let rawText = response.text;
    // Remove literal newlines/tabs that break JSON.parse in strings
    rawText = rawText.replace(/[\n\r\t]+/g, ' ');

    return JSON.parse(rawText);
  } catch (e) {
    console.warn("API Error during Gemini safety check. Falling back to MOCK mode.", e.message);
    return getMockData(e.message);
  }
}

module.exports = { extractFromImage, analyzeInteractions };
