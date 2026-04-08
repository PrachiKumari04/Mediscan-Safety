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

    console.log("📄 Raw OCR Text:", text);

    // Basic extraction logic: 
    // 1. Split by lines and common delimiters
    // 2. Look for words that look like medicine names (3+ chars, alphanumeric)
    const lines = text.split(/\n|,|;/);
    const medicines = [];
    
    // Set of common noise words to filter out
    const noise = new Set(['TABLET', 'TABLETS', 'CAPSULE', 'CAPSULES', 'MG', 'ML', 'DAILY', 'TAKE', 'DOSE', 'PATIENT', 'DOCTOR', 'NAME', 'DATE']);

    lines.forEach(line => {
      const words = line.trim().split(/\s+/);
      words.forEach(word => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanWord.length >= 3 && !noise.has(cleanWord) && !/^\d+$/.test(cleanWord)) {
          // Add to list if it looks like a proper name (not just numbers)
          if (!medicines.includes(cleanWord)) {
            medicines.push(cleanWord);
          }
        }
      });
    });

    console.log("🎯 Extracted Medicines (Local):", medicines);
    return medicines.length > 0 ? medicines : ["Unknown Medicine"];
  } catch (err) {
    console.error("❌ Local OCR Error:", err.message);
    throw new Error("Local OCR failed: " + err.message);
  }
}

module.exports = { extractFromImageLocal };
