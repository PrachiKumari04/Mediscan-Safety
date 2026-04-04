const { getDrugDetails } = require('./rxnav');
const { getFDAWarnings } = require('./openfda');
const { analyzeInteractions } = require('./gemini');

async function checkSafety(medicines, language = 'English') {
  const drugData = [];
  
  for (const med of medicines) {
    const [rxData, fdaData] = await Promise.all([
      getDrugDetails(med),
      getFDAWarnings(med)
    ]);
    
    drugData.push({
      name: med,
      composition: rxData.composition,
      rxcui: rxData.rxcui,
      warnings: fdaData.warnings,
      interactions: fdaData.interactions
    });
  }

  const safetyReport = await analyzeInteractions(drugData, language);
  return safetyReport;
}

module.exports = { checkSafety };
