const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Pool } = require('pg');
const xlsx = require('xlsx');
const fs = require('fs');
const { scrapeCompany } = require('./services/googleService');

const app = express();
const upload = multer({ dest: 'uploads/' });

const pool = new Pool({
  user: "postgres",
  host: "158.220.121.203",
  database: "postgres",
  password: "P0stgr3s%098",
  port: 5432,
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const processExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet).map(row => ({
      input_name: row['Company Name']?.toString().trim(),
      input_domain: (row['Domain']?.toString().toLowerCase().trim() || '').replace(/^https?:\/\/(www\.)?/, '')
    })).filter(company => company.input_name && company.input_domain);
  } catch (error) {
    throw new Error(`Excel processing failed: ${error.message}`);
  }
};

const generateOutput = (results) => {
  const formatted = results.map(r => ({
    'Given Company Name': r.given_company_name,
    'Given Domain': r.given_domain,
    'Result Company Name': r.result_company_name,
    'Result Domain': r.result_domain,
    'Full Address': r.full_address,
    'Revenue': r.revenue,
    'HQ Link': r.hq_link,
    'Error': r.error
  }));
  
  const ws = xlsx.utils.json_to_sheet(formatted);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Results');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

app.post('/scrape', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const companies = processExcel(req.file.path);
    if (!companies.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No valid companies in Excel' });
    }

    const results = [];
    const client = await pool.connect();
    
    try {
      const CHUNK_SIZE = 50;
      const DELAY_MS = 1000;
      
      for (let i = 0; i < companies.length; i += CHUNK_SIZE) {
        const chunk = companies.slice(i, i + CHUNK_SIZE);
        console.log(`Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(companies.length / CHUNK_SIZE)}`);

        const chunkResults = await Promise.all(
          chunk.map(async (company, chunkIndex) => {
            const globalIndex = i + chunkIndex;
            console.log(`Processing ${globalIndex + 1}/${companies.length}: ${company.input_name}`);
            return scrapeCompany(company);
          })
        );

        results.push(...chunkResults);
        await Promise.all(
          chunkResults.map(result => 
            client.query(`
              INSERT INTO company_data (
                given_company_name, given_domain, result_company_name, 
                result_domain, full_address, revenue, hq_link, error
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              result.given_company_name,
              result.given_domain,
              result.result_company_name,
              result.result_domain,
              result.full_address,
              result.revenue,
              result.hq_link,
              result.error
            ])
          )
        );

        if (i + CHUNK_SIZE < companies.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      const output = generateOutput(results);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=results.xlsx');
      res.send(output);

    } finally {
      client.release();
      fs.unlinkSync(req.file.path);
    }
  } catch (error) {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));