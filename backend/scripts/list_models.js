const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ No GEMINI_API_KEY found in .env");
    return;
  }
  
  console.log("🔍 Fetching available models for @google/genai...");
  try {
    // Attempt to list models using the correct SDK pattern
    // Based on the .d.ts, models might be accessible via ai.models
    const list = await ai.models.list(); 
    console.log("✅ AVAILABLE MODELS:");
    if (Array.isArray(list)) {
        list.forEach(m => console.log(`- ${m.name}`));
    } else {
        console.log(list);
    }
  } catch (err) {
    console.error("❌ Failed to list models:", err.message);
    console.log("💡 Trying direct listModels() call...");
    try {
        const list2 = await ai.listModels();
        console.log("✅ AVAILABLE MODELS:", list2);
    } catch (err2) {
        console.error("❌ All list attempts failed.");
    }
  }
}

listModels();
