import * as Papa from "papaparse";
import ExcelJS from "exceljs";

export interface ImportedRow {
  itemNumber?: string;
  gsrtcCode: string;
  description: string;
  quantity: number;
  unit: string;
  rate?: number;
  totalAmount?: number;
}

export class BOQImportService {
  static async importExcel(file: File): Promise<ImportedRow[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          return reject("No worksheets found in the Excel file.");
        }

        const rows: ImportedRow[] = [];
        
        // Find header row to map columns. Usually row 1 or 2.
        let itemNoCol = -1, codeCol = -1, descCol = -1, qtyCol = -1, unitCol = -1, rateCol = -1, totalCol = -1;
        
        // Basic heuristic: check first 5 rows for headers
        let headerRowIdx = -1;
        for (let i = 1; i <= 5; i++) {
          const row = worksheet.getRow(i);
          let foundCode = false;
          row.eachCell((cell, colNumber) => {
            const val = cell.text?.toLowerCase().replace(/[^a-z]/g, "") || "";
            if (val.includes("itemno") || val.includes("number")) {
              itemNoCol = colNumber;
            } else if (val.includes("code") || val.includes("itemcode") || val.includes("gsrtc")) {
              codeCol = colNumber;
              foundCode = true;
            } else if (val.includes("desc") || val.includes("item")) {
              descCol = colNumber;
            } else if (val.includes("qty") || val.includes("quantity")) {
              qtyCol = colNumber;
            } else if (val.includes("unit")) {
              unitCol = colNumber;
            } else if (val.includes("rate")) {
              rateCol = colNumber;
            } else if (val.includes("total") || val.includes("amount")) {
              totalCol = colNumber;
            }
          });
          
          if (foundCode) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1 || codeCol === -1) {
          return reject("Could not find required columns (Code, Description, Quantity, Unit). Please ensure headers exist.");
        }

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > headerRowIdx) {
            const code = row.getCell(codeCol).text?.trim();
            if (code) {
              rows.push({
                itemNumber: itemNoCol !== -1 ? row.getCell(itemNoCol).text?.trim() : undefined,
                gsrtcCode: code,
                description: descCol !== -1 ? row.getCell(descCol).text?.trim() || "" : "",
                quantity: qtyCol !== -1 ? parseFloat(row.getCell(qtyCol).text?.trim()) || 0 : 0,
                unit: unitCol !== -1 ? row.getCell(unitCol).text?.trim() || "" : "",
                rate: rateCol !== -1 ? parseFloat(row.getCell(rateCol).text?.trim()) || 0 : undefined,
                totalAmount: totalCol !== -1 ? parseFloat(row.getCell(totalCol).text?.trim()) || 0 : undefined,
              });
            }
          }
        });

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async importCSV(file: File): Promise<ImportedRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const rows: ImportedRow[] = [];
          
          if (data.length === 0) return resolve([]);
          
          const keys = Object.keys(data[0]);
          const itemNoKey = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, "").includes("itemno") || k.toLowerCase().replace(/[^a-z]/g, "").includes("number"));
          const codeKey = keys.find(k => k.toLowerCase().includes("code") || k.toLowerCase().includes("gsrtc"));
          const descKey = keys.find(k => k.toLowerCase().includes("desc") || k.toLowerCase().includes("item"));
          const qtyKey = keys.find(k => k.toLowerCase().includes("qty") || k.toLowerCase().includes("quantity"));
          const unitKey = keys.find(k => k.toLowerCase().includes("unit"));
          const rateKey = keys.find(k => k.toLowerCase().includes("rate"));
          const totalKey = keys.find(k => k.toLowerCase().includes("total") || k.toLowerCase().includes("amount"));
          
          if (!codeKey) {
            return reject("Could not find a 'Code' column in the CSV.");
          }

          for (const row of data) {
            const code = row[codeKey]?.trim();
            if (code) {
              rows.push({
                itemNumber: itemNoKey ? row[itemNoKey]?.trim() : undefined,
                gsrtcCode: code,
                description: descKey ? row[descKey]?.trim() : "",
                quantity: qtyKey ? parseFloat(row[qtyKey]) || 0 : 0,
                unit: unitKey ? row[unitKey]?.trim() : "",
                rate: rateKey ? parseFloat(row[rateKey]) || 0 : undefined,
                totalAmount: totalKey ? parseFloat(row[totalKey]) || 0 : undefined,
              });
            }
          }
          
          resolve(rows);
        },
        error: (error) => reject(error.message)
      });
    });
  }
}
