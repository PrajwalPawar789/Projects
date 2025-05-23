// index.js
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
      input_domain: row['Domain']?.toString().toLowerCase().trim()
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
    'Employees': r.employees,
    'HQ Link': r.hq_link,
    'Revenue Link': r.revenue_link,
    'Employees Link': r.employees_link,
    'Link Consistency': r.link_consistency,
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
      for (const [index, company] of companies.entries()) {
        console.log(`Processing ${index + 1}/${companies.length}: ${company.input_name}`);
        
        const result = await scrapeCompany(company);
        results.push(result);

        await client.query(`
          INSERT INTO company_data (
            given_company_name, given_domain, result_company_name, 
            result_domain, full_address, revenue, employees, 
            hq_link, revenue_link, employees_link, link_consistency, error
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          company.input_name,
          company.input_domain,
          result.result_company_name || '-',
          result.result_domain || '-',
          result.full_address || '-',
          result.revenue || '-',
          result.employees || '-',
          result.hq_link || '-',
          result.revenue_link || '-',
          result.employees_link || '-',
          result.link_consistency || '-',
          result.error || null
        ]);

        if (index < companies.length - 1) await new Promise(resolve => setTimeout(resolve, 10000));
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