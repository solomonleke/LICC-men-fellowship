import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_FILE_PATH = path.join(__dirname, 'data', 'licc_members_database.xlsx');

async function inspectAndFix() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE_PATH);

  console.log('--- SHEETS IN WORKBOOK ---');
  workbook.worksheets.forEach(ws => {
    console.log(`Sheet: ${ws.name}, rowCount: ${ws.rowCount}`);
  });

  const membersSheet = workbook.getWorksheet('Members');
  console.log('\n--- MEMBERS ROWS ---');
  membersSheet.eachRow((row, rowNumber) => {
    console.log(`Row ${rowNumber}:`, row.values);
  });

  const showcasesSheet = workbook.getWorksheet('Showcases');
  console.log('\n--- SHOWCASES ROWS ---');
  showcasesSheet.eachRow((row, rowNumber) => {
    console.log(`Row ${rowNumber}:`, row.values);
  });
}

inspectAndFix().catch(console.error);
