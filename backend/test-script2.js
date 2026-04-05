require('dotenv').config();
const { analyzeInteractions } = require('./services/gemini.js');

async function run() {
  const data = [
    { name: "Paracetamol", composition: "Paracetamol 500mg", warnings: "Liver damage", interactions: "Alcohol" }
  ];
  try {
    const report = await analyzeInteractions(data, 'English');
    console.log("REPORT OBJECT:", JSON.stringify(report, null, 2));
  } catch(e) {
    console.error("ERROR:", e);
  }
}
run();
