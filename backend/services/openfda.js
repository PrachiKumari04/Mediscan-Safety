const axios = require('axios');

async function getFDAWarnings(drugName) {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"+openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=1`;
    const res = await axios.get(url);
    const result = res.data.results[0];
    
    return {
      name: drugName,
      warnings: result.warnings?.join(' ') || result.boxed_warning?.join(' ') || "No specific warnings in openFDA label.",
      interactions: result.drug_interactions?.join(' ') || "No interaction section found."
    };
  } catch (error) {
    // 404 is common if drug isn't in openFDA by exact name
    console.error(`openFDA error for ${drugName}:`, error.response?.status === 404 ? 'Not found' : error.message);
    return { name: drugName, warnings: "Not found in openFDA", interactions: "Not found in openFDA" };
  }
}

module.exports = { getFDAWarnings };
