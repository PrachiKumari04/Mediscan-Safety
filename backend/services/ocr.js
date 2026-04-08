const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * Local OCR fallback using Tesseract.js
 * Configured to use local training data for restricted environments
 */
async function extractFromImageLocal(base64Image, mediaType) {
  console.log("⚙️ Starting local OCR extraction (Tesseract.js - Local Mode)...");
  
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Path to the directory containing eng.traineddata
    const langPath = path.join(__dirname, '..'); 
    
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
      gzip: false, // Ensure it doesn't try to download gzipped versions
      langPath: langPath,
      logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`)
    });

    console.log("📄 Raw OCR Text Extracted (Local).");
    return text;
  } catch (err) {
    console.error("❌ Local OCR Error:", err.message);
    throw new Error("Local OCR failed: " + err.message);
  }
}

module.exports = { extractFromImageLocal };
