const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractFromImage } = require('../services/gemini');
const { checkSafety } = require('../services/safety'); // Orchestration service
const { getMedicineInfo } = require('../services/groq');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/extract-medicines', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    console.log(`📸 Image received: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;
    
    const result = await extractFromImage(base64Image, mediaType);
    res.json(result);
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

router.post('/medicine-info', async (req, res) => {
  try {
    const { medicine, language } = req.body;
    if (!medicine) return res.status(400).json({ error: 'No medicine provided' });
    const result = await getMedicineInfo(medicine, language || 'English');
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Medicine Info check failed' });
  }
});

module.exports = router;
