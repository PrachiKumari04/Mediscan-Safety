const Tesseract = require('tesseract.js');
const path = require('path');
const sharp = require('sharp');

/**
 * Local OCR fallback using Tesseract.js
 * Optimized with Sharp preprocessing to handle handwritten prescriptions.
 */
async function extractFromImageLocal(base64Image, mediaType) {
  console.log("⚙️ Starting optimized OCR extraction...");
  
  try {
    // PRE-PROCESSING: Convert to grayscale and boost contrast
    // This helps Tesseract distinguish ink from paper in handwritten shots
    const rawBuffer = Buffer.from(base64Image, 'base64');
    const processedBuffer = await sharp(rawBuffer)
      .grayscale()
      .normalize() // Boosts contrast
      .sharpen()
      .toBuffer();
    
    // Path to the directory containing eng.traineddata
    const langPath = path.join(__dirname, '..'); 
    
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
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
