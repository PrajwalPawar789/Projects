// index.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { readCompaniesFromExcel } = require('./services/excelService');
const { scrapeCompany } = require('./services/googleService');
const XLSX = require('xlsx');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit();
});

app.post('/scrape', upload.single('file'), async (req, res) => {
  try {
    const companies = await readCompaniesFromExcel(req.file.path);
    
    // Validate required columns
    if (!companies[0]?.input_name || !companies[0]?.input_domain) {
      throw new Error('Excel must have "input_name" and "input_domain" columns');
    }

    const results = [];
    
    for (const company of companies) {
      console.log(`Processing: ${company.input_name} (${company.input_domain})`);
      const result = await scrapeCompany(company);
      results.push(result);
      await delay(10000);
    }

    sendExcelResponse(res, results);
  } catch (error) {
    res.status(500).json({ 
      error: 'Scraping failed',
      message: error.message,
      details: error.stack
    });
  }
});

function sendExcelResponse(res, data) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      bookSST: false
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', 'attachment; filename=scraping-results.xlsx');
    res.end(buffer);
    
  } catch (error) {
    throw new Error('Excel generation failed: ' + error.message);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});