require('dotenv').config();
const { extractFromImage } = require('./services/gemini');
const { analyzeInteractions } = require('./services/groq');

async function runTest() {
  console.log("🚀 Testing Bidirectional Fallbacks...");

  // Mock data
  const mockImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const mockDrugData = [{ name: "Paracetamol", composition: "Acetaminophen" }];

  console.log("\n--- TEST 1: Vision (Gemini primary, Groq fallback) ---");
  try {
    const medicines = await extractFromImage(mockImage, "image/png");
    console.log("✅ Vision Result:", medicines);
  } catch (e) {
    console.error("❌ Vision Test Failed:", e.message);
  }

  console.log("\n--- TEST 2: Analysis (Groq primary, Gemini fallback) ---");
  try {
    const report = await analyzeInteractions(mockDrugData, "English");
    console.log("✅ Analysis Result Status:", report.status);
    console.log("✅ Analysis Result Summary:", report.summary.substring(0, 50) + "...");
  } catch (e) {
    console.error("❌ Analysis Test Failed:", e.message);
  }
}

runTest();
