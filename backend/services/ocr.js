const Tesseract = require('tesseract.js');

/**
 * Local OCR fallback using Tesseract.js
 * Extract potential medicine names from an image buffer
 */
async function extractFromImageLocal(base64Image, mediaType) {
  console.log("⚙️ Starting local OCR extraction (Tesseract.js)...");
  
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
      logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`)
    });

    console.log("📄 Raw OCR Text Extracted.");
    
    // Return the full text block. We will let the Text AI (Refinement)
    // handle the noise, as it has better medical context than a simple regex.
    return text;
  } catch (err) {
    console.error("❌ Local OCR Error:", err.message);
    throw new Error("Local OCR failed: " + err.message);
  }
}

module.exports = { extractFromImageLocal };
