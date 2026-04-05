require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
     const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: 'Say hi',
     });
     console.log("RESPONSE KEYS:", Object.keys(response));
     console.log("RESPONSE TEXT:", typeof response.text === 'function' ? 'function' : response.text);
     console.log("RESPONSE DATA:", response);
  } catch(e) { console.error(e); }
}
run();
