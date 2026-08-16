import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";

const prisma = new PrismaClient();

const NAME_OF_WORK = "Construction Of New Depot/Workshop at Chansma @ Mehsana Division";
const NAME_OF_AGENCY = "Skyline Projects";

async function run() {
  console.log("Generating Chansma Format Rate Analysis Excel...");
  
  const allRAs = await prisma.rateAnalysis.findMany({
    include: {
      sorItem: true,
      components: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { sorItem: { itemCode: 'asc' } }
  });
  
  const exportData: any[] = [];
  
  // Header Rows
  exportData.push([`Name of Work : ${NAME_OF_WORK}`]);
  exportData.push([`Name of Agency : ${NAME_OF_AGENCY}`]);
  exportData.push([]);
  exportData.push(["Item No.", "Description", "Qty", "Unit", "Rate", "Total Rs."]);
  
  for (const ra of allRAs) {
    if (!ra.sorItem.itemCode.startsWith("RJ")) continue;
    
    // Main Item Row
    exportData.push([
      ra.sorItem.itemCode.replace("RJ", ""), // '1', '2', etc.
      ra.sorItem.description,
      1,
      ra.sorItem.unit,
      "",
      ""
    ]);
    
    let totalAmount = 0;
    
    // Components
    for (const c of ra.components) {
      // In the target format, the base rates are 10% lower because 10% profit is added at the end.
      // So we reverse-engineer the base rate by dividing by 1.10
      const baseRate = Number((Number(c.rate) / 1.10).toFixed(2));
      const baseAmount = Number((Number(c.quantity) * baseRate).toFixed(2));
      totalAmount += baseAmount;
      
      exportData.push([
        "",
        c.description,
        Number(c.quantity),
        c.unit,
        baseRate,
        baseAmount
      ]);
    }
    
    // Totals
    const targetRate = Number(ra.sorItem.rate);
    const overhead = Number((targetRate - totalAmount).toFixed(2));
    
    exportData.push(["", "total", "", "", "", Number(totalAmount.toFixed(2))]);
    exportData.push(["", "profit/overhead 10%", "", "", "", overhead]);
    exportData.push(["", "Total Rs.", "", "", "", targetRate]);
    exportData.push(["", "Say Rs.", "", "", "", Math.round(targetRate)]);
    exportData.push([]);
  }
  
  const exportWorkbook = xlsx.utils.book_new();
  const exportWs = xlsx.utils.aoa_to_sheet(exportData); // using aoa_to_sheet for array of arrays
  
  // Set column widths for better formatting
  exportWs['!cols'] = [
    { wch: 10 },  // Item No
    { wch: 80 },  // Description
    { wch: 10 },  // Qty
    { wch: 10 },  // Unit
    { wch: 15 },  // Rate
    { wch: 15 }   // Total
  ];
  
  xlsx.utils.book_append_sheet(exportWorkbook, exportWs, "Rate Analysis");
  
  const exportPath = "D:/My Own Software/BOQ Engine Pro/Rate_Analysis_Chansma_Format.xlsx";
  xlsx.writeFile(exportWorkbook, exportPath);
  
  console.log(`Saved at ${exportPath}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
