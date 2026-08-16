import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";

const prisma = new PrismaClient();

async function run() {
  console.log("Generating final review Excel...");
  
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
  
  for (const ra of allRAs) {
    if (!ra.sorItem.itemCode.startsWith("RJ")) continue;
    
    exportData.push({
      "Item Code": ra.sorItem.itemCode,
      "Description": ra.sorItem.description.substring(0, 100) + "...",
      "Unit": ra.sorItem.unit,
      "Target Rate": ra.sorItem.rate,
      "Template": ra.templateName,
      "Component": "",
      "Qty": "",
      "Comp Unit": "",
      "Comp Rate": "",
      "Amount": ""
    });
    
    for (const c of ra.components) {
      exportData.push({
        "Item Code": "",
        "Description": "",
        "Unit": "",
        "Target Rate": "",
        "Template": "",
        "Component": `[${c.type}] ${c.description}`,
        "Qty": Number(c.quantity),
        "Comp Unit": c.unit,
        "Comp Rate": Number(c.rate),
        "Amount": Number(c.amount)
      });
    }
    
    exportData.push({});
  }
  
  const exportWorkbook = xlsx.utils.book_new();
  const exportWs = xlsx.utils.json_to_sheet(exportData);
  xlsx.utils.book_append_sheet(exportWorkbook, exportWs, "Rate Analysis");
  
  const exportPath = "D:/My Own Software/BOQ Engine Pro/Rate_Analysis_Final_Review.xlsx";
  xlsx.writeFile(exportWorkbook, exportPath);
  
  console.log(`Saved at ${exportPath}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
