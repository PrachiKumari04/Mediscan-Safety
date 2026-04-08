const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Deployment Status Check
app.get('/api/status', (req, res) => {
  res.json({
    status: "online",
    version: "1.1.0",
    ocr_system: "Tesseract + AI Refinement",
    timestamp: "2026-04-08T12:08:00Z"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
