const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { readCompaniesFromExcel } = require('./services/excelService');
const { scrapeGoogle, closeBrowser } = require('./services/googleService');
const { scrapeZoomInfo } = require('./services/zoominfoService');
const XLSX = require('xlsx');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Browser cleanup on exit
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit();
});

// Main scraping endpoint
app.post('/scrape', upload.single('file'), async (req, res) => {
  try {
    const companies = await readCompaniesFromExcel(req.file.path);
    const results = [];
    
    console.log(`\n=== Starting scrape for ${companies.length} companies ===`);
    
    for (const [index, company] of companies.entries()) {
      console.log(`\nProcessing ${index + 1}/${companies.length}: ${company['Company Name']}`);
      const result = await processCompany(company);
      results.push(result);
      
      // Randomized delay between 3-10 seconds
      await delay(3000 + Math.random() * 7000);
    }

    sendExcelResponse(res, results);
  } catch (error) {
    console.error('\n!!! SCRAPING FAILED !!!', error);
    res.status(500).json({ 
      error: 'Scraping failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    await closeBrowser();
  }
});

// Company processing logic
async function processCompany(company) {
  try {
    const query = `site:zoominfo.com inurl:/c/ intext:revenue ${company['Company Name']} ${company.Domain}`;
    console.log(`Search Query: "${query}"`);

    // Get ZoomInfo URL
    const zoominfoUrl = await scrapeGoogle(query, company['Company Name']);
    console.log('Found ZoomInfo URL:', zoominfoUrl || 'Not found');
    
    if (!zoominfoUrl) return createDefaultResult(company);

    // Scrape ZoomInfo page
    console.log('Scraping ZoomInfo page...');
    const { name, domain, revenue } = await scrapeZoomInfo(zoominfoUrl);
    
    console.log('Scraped Data:', {
      name: name || '-',
      domain: domain || '-',
      revenue: revenue || '-'
    });

    return formatResult(company, zoominfoUrl, { name, domain, revenue });
  } catch (error) {
    console.error(`Processing failed: ${error.message}`);
    return createDefaultResult(company);
  }
}

// Helper functions
function createDefaultResult(company) {
  return {
    'Given Company Name': company['Company Name'],
    'Given Domain': company.Domain,
    'Result URL': '-',
    'Company Name': '-',
    'Domain': '-',
    'Revenue': '-'
  };
}

function formatResult(company, url, data) {
  return {
    'Given Company Name': company['Company Name'],
    'Given Domain': company.Domain,
    'Result URL': url,
    'Company Name': data.name || '-',
    'Domain': data.domain || '-',
    'Revenue': (data.revenue || '-').replace(/\s+/g, ' ')
  };
}

function sendExcelResponse(res, data) {
  try {
    console.log('\nGenerating Excel file...');
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      bookSST: false
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=scraping-results.xlsx');
    res.end(buffer);
    
    console.log('Excel file generated successfully');
  } catch (error) {
    console.error('Excel generation failed:', error);
    throw new Error('Failed to generate Excel file: ' + error.message);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n=== Server running on http://localhost:${PORT} ===`);
  console.log('Ready to accept Excel file uploads');
});