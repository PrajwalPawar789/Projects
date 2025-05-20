const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { readCompaniesFromExcel } = require('./services/excelService');
const { scrapeGoogle } = require('./services/googleService');
const { scrapeZoomInfo } = require('./services/zoominfoService');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));

app.post('/scrape', upload.single('file'), async (req, res) => {
  try {
    const companies = await readCompaniesFromExcel(req.file.path);
    const results = [];
    
    for (const company of companies) {
      const result = await processCompany(company);
      results.push(result);
      await delay(5000 + Math.random() * 10000); // Randomized delay
    }

    sendExcel(res, results);
  } catch (error) {
    console.error('Scraping failed:', error);
    res.status(500).send(error.message);
  }
});

async function processCompany(company) {
  try {
    console.log('\n=== Processing Company ===');
    console.log('Input:', company);

    const query = `site:zoominfo.com inurl:/c/ intext:revenue ${company['Company Name']} ${company.Domain}`;
    const zoominfoUrl = await scrapeGoogle(query, company['Company Name']);
    
    if (!zoominfoUrl) return createDefaultResult(company);
    
    const { name, domain, revenue } = await scrapeZoomInfo(zoominfoUrl);
    console.log('Scraped Data:', { name, domain, revenue });
    
    return {
      'Given Company Name': company['Company Name'],
      'Given Domain': company.Domain,
      'Result URL': zoominfoUrl,
      'Company Name': name || '-',
      'Domain': domain || '-',
      'Revenue': revenue || '-'
    };
  } catch (error) {
    console.error(`Failed ${company['Company Name']}:`, error.message);
    return createDefaultResult(company);
  }
}

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

function sendExcel(res, data) {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=results.xlsx');
    res.end(buffer);
  } catch (error) {
    console.error('Excel creation failed:', error);
    res.status(500).send('Error generating Excel file');
  }
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));