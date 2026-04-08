require('dotenv').config();
const { extractFromImage } = require('./services/gemini');
const { checkSafety } = require('./services/safety');

async function test() {
  console.log("--- Testing Dual-Engine Integration ---");
  
  // Test 1: Extraction (Gemini)
  console.log("\n1. Testing Image Extraction (Gemini)...");
  let medicines = ["Paracetamol", "Ibuprofen"]; // Default for safety test
  try {
    const mockImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const result = await extractFromImage(mockImage, "image/png");
    medicines = result.medicines;
    console.log(`✅ Extraction successful (via ${result.method}):`, medicines);
  } catch (err) {
    console.warn("⚠️ Extraction test failed (likely rate limit):", err.message);
    console.log("Proceeding with default medicines for Groq test...");
  }
    
  // Test 2: Safety Analysis (Groq)
  console.log("\n2. Testing Safety Analysis (Groq)...");
  try {
    console.log("Calling checkSafety with medicines:", medicines);
    const report = await checkSafety(medicines, "English");
    console.log("✅ Safety Report received!");
    console.log("✅ Status:", report.status);
    console.log("✅ Summary (First 100 chars):", report.summary?.substring(0, 100) + "...");
  } catch (err) {
    console.error("❌ Groq test failed:", err.message);
  }
}

test();
