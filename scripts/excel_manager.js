import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_FILE_PATH = path.join(__dirname, '..', 'server', 'data', 'licc_members_database.xlsx');

import { getWorkbook } from '../server/excelDatabase.js';

async function runExcelManager() {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';

  console.log('----------------------------------------------------');
  console.log('📊 LICC Men Fellowship Excel Database Manager Utility');
  console.log(`📁 File Target: ${EXCEL_FILE_PATH}`);
  console.log('----------------------------------------------------\n');

  const workbook = await getWorkbook();


  if (command === 'validate') {
    console.log('🔍 Auditing Worksheets & Checking Duplicate Phone Numbers...\n');
    const membersSheet = workbook.getWorksheet('Members');

    const phoneSeen = new Map();
    let duplicateCount = 0;
    let totalMembers = 0;

    membersSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      totalMembers++;
      const name = `${row.getCell('firstName').value} ${row.getCell('lastName').value}`;
      const phone = String(row.getCell('whatsappPhone').value || '').trim();

      if (phoneSeen.has(phone)) {
        console.warn(`⚠️ DUPLICATE FOUND: Phone ${phone} is shared by "${name}" (Row ${rowNumber}) and "${phoneSeen.get(phone)}"`);
        duplicateCount++;
      } else {
        phoneSeen.set(phone, name);
      }
    });

    console.log(`✅ Audit Complete: ${totalMembers} total members evaluated.`);
    if (duplicateCount === 0) {
      console.log('✨ All primary WhatsApp phone numbers in Excel database are 100% UNIQUE!');
    } else {
      console.log(`❌ Found ${duplicateCount} duplicate records.`);
    }

  } else if (command === 'export') {
    const exportPath = path.join(__dirname, '..', `licc_members_backup_${Date.now()}.json`);
    const data = {};

    workbook.worksheets.forEach(sheet => {
      const rows = [];
      const headers = sheet.getRow(1).values.filter(Boolean);
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData = {};
        headers.forEach((h, colIdx) => {
          rowData[h] = row.getCell(colIdx + 1).value;
        });
        rows.push(rowData);
      });
      data[sheet.name] = rows;
    });

    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    console.log(`💾 Data successfully exported to JSON backup: ${exportPath}`);
  } else {
    console.log('Unknown command. Available commands: validate, export');
  }
}

runExcelManager().catch(err => {
  console.error('Execution error:', err);
});
