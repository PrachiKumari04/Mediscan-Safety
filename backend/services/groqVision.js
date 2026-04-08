
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function extractFromImageGroq(base64Image, mediaType) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("No GROQ_API_KEY for vision fallback");
  }

  try {
    const dataUri = `data:${mediaType};base64,${base64Image}`;

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview", // Robust vision model for medical labels
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "System: You are an expert medical OCR assistant. \nTask: Extract all medicine brand names and generic names from this image. \nInstruction: Return ONLY a JSON array of strings e.g. [\"Paracetamol\", \"Metformin\"]. No chat or markdown."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUri
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0].message.content;

    // Attempt to parse JSON. Sometimes LLMs return { "medicines": [...] } or just [...]
    try {
      const parsed = JSON.parse(content);
      // Universal normalization: extract array from any object shape
      const normalize = (data) => {
        if (Array.isArray(data)) return data.map(m => typeof m === 'string' ? m : (m.name || JSON.stringify(m)));
        if (typeof data === 'object') {
          const list = data.medicines || data.list || data.names || Object.values(data).find(Array.isArray);
          return list ? normalize(list) : ["Unknown Medicine"];
        }
        return ["Unknown Medicine"];
      };
      
      return normalize(parsed);
    } catch (e) {
      // Fallback: search for array-like pattern if JSON.parse fails
      const match = content.match(/\[.*\]/s);
      if (match) return JSON.parse(match[0]);
      throw new Error("Failed to parse medicines from Groq Vision response");
    }
  } catch (error) {
    console.error("Groq Vision Fallback Error:", error.message);
    throw error;
  }
}

module.exports = { extractFromImageGroq };
