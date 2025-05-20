const XLSX = require('xlsx');

const readCompaniesFromExcel = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
};

module.exports = { readCompaniesFromExcel };