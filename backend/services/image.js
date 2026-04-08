const sharp = require('sharp');

/**
 * Compresses an image to ensure it stays within AI API limits (usually < 4MB base64).
 * Also optimizes for OCR by boosting contrast and sharpening.
 */
async function prepareImageForAI(base64Image) {
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    
    // We aim for around 1000px width which is plenty for OCR while being lightweight
    const processedBuffer = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .jpeg({ quality: 80 }) 
      .toBuffer();
      
    return processedBuffer.toString('base64');
  } catch (err) {
    console.warn("⚠️ Image compression failed, using original:", err.message);
    return base64Image;
  }
}

module.exports = { prepareImageForAI };
