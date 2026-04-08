const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const genai = new GoogleGenAI(process.env.GEMINI_API_KEY);

async function listModels() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ No GEMINI_API_KEY found in .env");
    return;
  }
  
  try {
    const list = await genai.listModels();
    console.log("✅ AVAILABLE MODELS:");
    list.models.forEach(m => {
      console.log(`- ${m.name} (supports: ${m.supportedMethods.join(', ')})`);
    });
  } catch (err) {
    console.error("❌ Failed to list models:", err.message);
  }
}

listModels();
