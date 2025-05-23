const XLSX = require('xlsx');

const readCompaniesFromExcel = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const companies = XLSX.utils.sheet_to_json(sheet);
  
  // Map your Excel columns to the expected input names
  return companies.map(company => ({
    input_name: company['input_name'], // Your actual column name
    input_domain: company['input_domain']      // Your actual column name
  }));
};

module.exports = { readCompaniesFromExcel };