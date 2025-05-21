const cheerio = require('cheerio');
const fs = require('fs'); // Add filesystem module

const API_KEY = '4f8df42a5f10339c3f759265a9033816';
const searchQuery = 'site:zoominfo.com inurl:/c/ intext:Headquarters RevX revx.io';
const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
const encodedUrl = encodeURIComponent(googleSearchUrl);
const proxyUrl = `https://api.scraperapi.com/?api_key=${API_KEY}&url=${encodedUrl}`;

async function scrapeGoogle() {
  try {
    const response = await fetch(proxyUrl);
    const html = await response.text();

    // 1. Save raw HTML to file
    fs.writeFileSync('output.html', html); // Check this file for CAPTCHAs/blocks
    console.log('Raw HTML saved to output.html');

    // 2. Parse results
    const $ = cheerio.load(html);
    const results = [];

    // Updated selector (Google often changes HTML structure)
    $('div.g, div.yuRUbf').each((i, el) => { // Try multiple selectors
      const title = $(el).find('h3, div.MBeuO').first().text(); // Updated title selector
      const link = $(el).find('a').attr('href');
      const snippet = $(el).find('div.VwiC3b, span.HwtpBd').text(); // Alternate snippet selector
      
      if (title && link) {
        results.push({
          title: title.trim(),
          link: link.startsWith('/') ? `https://www.google.com${link}` : link, // Fix relative links
          snippet: snippet.trim()
        });
      }
    });

    console.log('✅ Results:', results.length > 0 ? results : 'No results found');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

scrapeGoogle();