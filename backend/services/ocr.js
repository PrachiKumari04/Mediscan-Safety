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
      gzip: false,
      langPath: langPath,
      logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`),
      // Medical labels are often complex; these settings help preserve structure
      init_oem: 1, // Neural nets LSTM only
      tessedit_pageseg_mode: 3, // Fully automatic page segmentation, but no OSD
    });

    console.log("📄 Raw OCR Text Extracted (Local).");
    return text;
  } catch (err) {
    console.error("❌ Local OCR Error:", err.message);
    throw new Error("Local OCR failed: " + err.message);
  }
}

module.exports = { extractFromImageLocal };
