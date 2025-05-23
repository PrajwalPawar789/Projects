const axios = require('axios');

const API_KEY = '1ccd151db8db14c30dd3d546ca48eaf7';


const parseJsonResult = (result) => {
  try {
    const description = result.description || '';
    
// Enhanced address extraction with multiple fallbacks
    const addressMatch = description.match(
      /(?:Address|Headquarters|Location)[\s:.,-]*([^\n\r]+?)(?=\s*(?:Phone|Website|Revenue|$))/i
    ) || description.match(
      /Location[.:]\s*((?:.(?!\s*(?:Phone|Website|Revenue)))+)/si
    );

    let rawAddress = addressMatch?.[1]?.trim() || '-';
// Enhanced address cleaning
const cleanedAddress = rawAddress
  // Remove common introductory phrases
  .replace(/^(are located at|located at|address:|headquarters:|location:|-\s*)/gi, '')
  // Remove trailing signs/actions
  .replace(/\s*(Sign\s.*|\.\.+|;|,\.|,\s*\.)\s*$/gi, '')
  // Fix common typos
  .replace(/United\s*ates/gi, 'United States')
  // Remove mid-address annotations
  .replace(/(\b(?:near|e|fl|unit|building|no\.?|sec-|ave)\b)[\s.,]*/gi, '$1 ')
  // Normalize spacing and commas
  .replace(/\s+/g, ' ')
  .replace(/,+/g, ', ')
  .replace(/,\s*,/g, ',')
  // Trim trailing commas/whitespace
  .replace(/[,\s]+$/g, '')
  // Capitalize consistent format
  .split(', ')
  .map(part => part.trim().replace(/\b\w/g, c => c.toUpperCase()))
  .join(', ')
  // Final cleanup
  .replace(/\s{2,}/g, ' ')
  .trim();

    // Revenue extraction
    const revenueMatch = description.match(
      /Revenue[.:]\s*(\$[\d,.]+(?:\s*[mbk]illion)?)/i
    ) || description.match(
      /(?:Annual Revenue|Sales)[.:]\s*(\$[\d,.]+)/i
    );

    let rawRevenue = revenueMatch?.[1]?.trim() || '-';
    const cleanedRevenue = rawRevenue
      .replace(/\s+/g, ' ')
      .replace(/(\d) ?([mbk]illion)/gi, '$1$2')
      .replace(/million/i, 'M')
      .replace(/billion/i, 'B')
      .replace(/thousand/i, 'K')
      .trim();

    // Domain extraction
    const domainMatch = description.match(
      /Website[.:]\s*(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i
    );
    
    return {
      companyName: result.title.split(' - ')[0].trim(),
      domain: (domainMatch?.[1] || '').toLowerCase(),
      address: cleanedAddress,
      revenue: cleanedRevenue,
      link: result.url
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
};

const scrapeSearch = async (query) => {
  try {
    const response = await axios.get('https://serpapi.abcproxy.com/search', {
      params: {
        engine: 'google',
        q: query,
        api_key: API_KEY,
        output: 'json',
        fetch_mode: 'static'
      },
      timeout: 20000
    });

    const organicResults = response.data.data?.organic_results;
    if (!organicResults?.length) return null;

    return parseJsonResult(organicResults[0]);
  } catch (error) {
    console.error('API request failed:', error.message);
    return null;
  }
};

const scrapeCompany = async (company) => {
  const resultTemplate = {
    given_company_name: company.input_name,
    given_domain: company.input_domain,
    result_company_name: '-',
    result_domain: '-',
    full_address: '-',
    revenue: '-',
    hq_link: '-',
    error: null
  };

  try {
    const query = `site:zoominfo.com/c/ intext:"Headquarters" ${company.input_name} ${company.input_domain}`;
    const result = await scrapeSearch(query);

    if (!result) throw new Error('No headquarters data found');

    const cleanInputDomain = company.input_domain.replace(/^www\./, '').toLowerCase();
    const resultDomain = result.domain.replace(/^www\./, '').toLowerCase();

    return {
      ...resultTemplate,
      result_company_name: result.companyName,
      result_domain: resultDomain === cleanInputDomain ? result.domain : '-',
      full_address: result.address,
      revenue: result.revenue,
      hq_link: result.link
    };
  } catch (error) {
    return {
      ...resultTemplate,
      error: error.message
    };
  }
};

module.exports = { scrapeCompany };