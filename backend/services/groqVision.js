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
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all medicine brand and generic names from this photo of tablet, strip, or handwritten prescription. Return ONLY an exact JSON array of strings e.g. [\"Medicine A\", \"Medicine B\"]. Do not add any conversational text."
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
      response_format: { type: "json_object" } // Optional, but helps Groq
    });

    const content = chatCompletion.choices[0].message.content;
    
    // Attempt to parse JSON. Sometimes LLMs return { "medicines": [...] } or just [...]
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : (parsed.medicines || []);
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
