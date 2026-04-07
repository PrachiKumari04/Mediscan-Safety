const Groq = require('groq-sdk');

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
      cleanMessage = "Groq API limit reached. Please wait a moment and try again.";
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
      alternatives: [consultDoctor],
      details: drugData.map(d => ({
        medicine: d.name,
        composition: d.composition || unknownComp,
        dosage: takeAsDirected,
        warnings: d.warnings || noWarnings
      }))
    };
  };

  if (!process.env.GROQ_API_KEY) {
    return getMockData("No GROQ_API_KEY provided in .env");
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

  const prompt = `You are an expert, friendly pharmacist talking to a patient with no medical background.
  Please analyze the following medicines: ${medicineNames}.
  
  CRITICAL INSTRUCTIONS:
  1. Translate ALL text VALUES into ${language}. DO NOT translate the JSON property keys! The keys must remain exactly "status", "summary", "alternatives", "details", "medicine", "composition", "dosage", and "warnings" in English.
  2. Use EXTREMELY SIMPLE language. Explain it like you are talking to a 10-year-old.
  3. DO NOT use big medical jargon, hard words, or complex chemical names if you can avoid it.
  4. Classify overall risk as SAFE / CAUTION / DANGEROUS.
  5. For each medicine give: what it is usually for (composition made simple), simple dosage, simple allergy warnings. 
  6. If risky, explain it very simply and suggest 2-3 common Indian alternatives. Always add a short disclaimer to ask a doctor.
  7. Use your own extensive medical knowledge to provide the composition, dosage, and warnings for each medicine. DO NOT say "I don't know" or "The information provided doesn't say". You know what these medicines are!
  8. Do NOT mention databases, the source of your information, or the fact that data was missing. Just state the facts.
  9. If a medicine name seems misspelled, incomplete, or if you don't recognize it perfectly, use your medical intuition to GUESS the most likely intended medicine based on common Indian drugs. Analyze your best guess and briefly mention that you corrected the spelling.
  
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
    console.warn("Groq API Error during safety check. Falling back to MOCK mode.", e.message);
    return getMockData(e.message);
  }
}

module.exports = { analyzeInteractions };
