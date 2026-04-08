const sharp = require('sharp');

/**
 * Compresses an image to ensure it stays within AI API limits (usually < 4MB base64).
 * Also optimizes for OCR by boosting contrast and sharpening.
 */
async function prepareImageForAI(base64Image) {
  try {
    if (!base64Image) return base64Image;
    const buffer = Buffer.from(base64Image, 'base64');
    
    // FAIL-SAFE: If buffer is tiny or invalid, don't even try sharp
    if (buffer.length < 100) return base64Image;

    const processedBuffer = await sharp(buffer)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .jpeg({ quality: 80 }) 
      .toBuffer();
      
    return processedBuffer.toString('base64');
  } catch (err) {
    console.error("⚠️ Sharp Pre-processing failed (Process continues):", err.message);
    return base64Image; // Return original on ANY error to prevent crash
  }
}

module.exports = { prepareImageForAI };
