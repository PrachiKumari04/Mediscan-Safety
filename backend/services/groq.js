const Groq = require('groq-sdk');
const { analyzeInteractionsGemini } = require('./geminiAnalysis');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function analyzeInteractions(drugData, language = 'English') {
  const getMockData = (errorMessage = "") => {
    const errorStr = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage || "");
    
    // Default English strings
    let cleanMessage = "AI service temporarily unavailable. Please try again later.";
    let consultDoctor = "Please consult a doctor";
    let takeAsDirected = "Take as directed";
    let unknownComp = "Unknown";
    let noWarnings = "No major warnings found.";

    if (errorStr.includes("429") || errorStr.includes("Limit") || errorStr.includes("limit")) {
      cleanMessage = "Groq API limit reached. Trying Gemini fallback...";
    }

    if (language === 'Hindi') {
      cleanMessage = (errorStr.includes("429") || errorStr.includes("limit")) ? "अभी बहुत अधिक अनुरोध आ रहे हैं। कृपया कुछ समय प्रतीक्षा करें और फिर से प्रयास करें।" : "AI सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।";
      consultDoctor = "कृपया डॉक्टर से सलाह लें";
      takeAsDirected = "निर्देशानुसार लें";
      unknownComp = "अज्ञात";
      noWarnings = "कोई बड़ी चेतावनी नहीं मिली।";
    } else if (language === 'Marathi') {
      cleanMessage = (errorStr.includes("429") || errorStr.includes("limit")) ? "सध्या खूप विनंत्या येत आहेत. कृपया थोडा वेळ प्रतीक्षा करा आणि पुन्हा प्रयत्न करा." : "AI सेवा तात्पुरती अनुपलब्ध आहे. कृपया नंतर पुन्हा प्रयत्न करा.";
      consultDoctor = "कृपया डॉक्टरांचा सल्ला घ्या";
      takeAsDirected = "निर्देशानुसार घ्या";
      unknownComp = "अज्ञात";
      noWarnings = "कोणतेही मोठे इशारे आढळले नाहीत.";
    } else if (language === 'Tamil') {
      cleanMessage = (errorStr.includes("429") || errorStr.includes("limit")) ? "தற்போது பல கோரிக்கைகள் வருகின்றன. சிறிது நேரம் காத்திருந்து மீண்டும் முயற்சிக்கவும்." : "AI சேவை தற்காலிகமாக கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.";
      consultDoctor = "தயவுசெய்து மருத்துவரை அணுகவும்";
      takeAsDirected = "இயக்கப்பட்டபடி எடுக்கவும்";
      unknownComp = "தெரியவில்லை";
      noWarnings = "பெரிய எச்சரிக்கைகள் எதுவும் கிடைக்கவில்லை.";
    }

    return {
      status: "CAUTION",
      summary: cleanMessage,
      alternatives: [{ name: consultDoctor, type: "Notice", reason: "AI service connection error" }],
      details: drugData.map(d => ({
        medicine: d.name,
        composition: d.composition || unknownComp,
        dosage: takeAsDirected,
        warnings: d.warnings || noWarnings
      }))
    };
  };

  if (!process.env.GROQ_API_KEY) {
    console.log("🔄 Groq key missing. Trying Gemini fallback...");
    try {
      return await analyzeInteractionsGemini(drugData, language);
    } catch (e) {
      return getMockData("No GROQ_API_KEY provided in .env");
    }
  }

  // Clean drugData
  const cleanDrugData = drugData.map(d => {
    const cleanD = { ...d };
    if (typeof cleanD.composition === 'string' && (cleanD.composition.includes("Unknown") || cleanD.composition.includes("Not found") || cleanD.composition.includes("Error"))) delete cleanD.composition;
    if (typeof cleanD.warnings === 'string' && cleanD.warnings.includes("Not found")) delete cleanD.warnings;
    if (typeof cleanD.interactions === 'string' && cleanD.interactions.includes("Not found")) delete cleanD.interactions;
    return cleanD;
  });

  const medicineNames = drugData.map(d => d.name).join(", ");

  const prompt = `You are a highly experienced Indian Pharmacist and Safety Expert.
  Please analyze the following medicines: ${medicineNames}.
  
  CRITICAL INSTRUCTIONS:
  1. Translate ALL text VALUES into ${language}. DO NOT translate the JSON property keys!
  2. Use EXTREMELY SIMPLE language (10-year-old level).
  3. Classify overall risk as SAFE / CAUTION / DANGEROUS.
  4. For each medicine: simple composition, dosage, and allergy warnings. 
  5. SUGGESTED ALTERNATIVES: This is the most important part. Identify 2-3 TRULY BEST choices for the patient. 
     - Focus on "Generic Equivalents" (same salt, lower price) or "Safer Alternatives" (different salt, fewer side effects).
     - Provide a clear reason WHY it is better.
     - Ensure these are common in India.
  6. Use your own knowledge. DO NOT say "I don't know". 
  7. If medicine name is misspelled, GUESS the most likely Indian drug and analyze it. Mention you corrected the name.
  
  (Optional context):
  ${JSON.stringify(cleanDrugData, null, 2)}
  
  Return output STRICTLY as this JSON structure:
  {
    "status": "SAFE|CAUTION|DANGEROUS",
    "summary": "Plain language explanation in ${language}",
    "alternatives": [
      { "name": "Medicine Name", "type": "Generic Equivalent | Safer Alternative", "reason": "Specific reason why this is a best choice in ${language}" }
    ],
    "details": [
       { "medicine": "Name", "composition": "...", "dosage": "...", "warnings": "..." }
    ]
  }`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content);
    return result;
  } catch (e) {
    if (e.status === 429 || (e.message && (e.message.includes('429') || e.message.includes('Limit')))) {
      console.warn("🔄 Groq limit reached. Switching to Gemini analysis fallback...");
      try {
        return await analyzeInteractionsGemini(drugData, language);
      } catch (geminiError) {
        console.error("Both Groq and Gemini Analysis failed.", geminiError.message);
        return getMockData(e.message);
      }
    }
    console.warn("Groq API Error. Falling back to mock data.", e.message);
    return getMockData(e.message);
  }
}

module.exports = { analyzeInteractions };
