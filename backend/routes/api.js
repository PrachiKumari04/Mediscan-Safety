const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractFromImage } = require('../services/gemini');
const { checkSafety } = require('../services/safety'); // Orchestration service

const upload = multer({ storage: multer.memoryStorage() });

router.post('/extract-medicines', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    console.log(`📸 Image received: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;
    
    const medicines = await extractFromImage(base64Image, mediaType);
    res.json({ medicines });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Extraction failed' });
  }
});

router.post('/check-safety', async (req, res) => {
  try {
    const { medicines, language } = req.body; 
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'No medicines provided' });
    }
    const result = await checkSafety(medicines, language || 'English');
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Safety check failed' });
  }
});

module.exports = router;
