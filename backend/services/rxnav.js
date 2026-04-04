const axios = require('axios');

async function getDrugDetails(drugName) {
  try {
    // 1. Get RxCUI
    const searchRes = await axios.get(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`);
    const rxcui = searchRes.data?.idGroup?.rxnormId?.[0];
    
    if (!rxcui) return { name: drugName, rxcui: null, composition: "Unknown" };

    // 2. Get properties (composition)
    const propsRes = await axios.get(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allProperties.json?prop=ATTRIBUTES`);
    const props = propsRes.data?.propConceptGroup?.propConcept || [];
    
    const activeIngredients = props.filter(p => p.propName === 'Active_ingredient').map(p => p.propValue).join(', ');
    
    return {
      name: drugName,
      rxcui,
      composition: activeIngredients || "Not found in RxNav"
    };
  } catch (error) {
    console.error(`RxNav error for ${drugName}:`, error.message);
    return { name: drugName, rxcui: null, composition: "Error fetching data" };
  }
}

module.exports = { getDrugDetails };
