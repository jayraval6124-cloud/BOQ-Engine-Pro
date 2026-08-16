import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient();

const SOR_YEAR = "2024-25";

const FILES = [
  "D:\\Office\\Jay\\Master DTP\\Ahmedabad\\Ahmedabad 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Amreli\\Amreli 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Bharuch\\Bharuch 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Bhavnagar\\Bhavnagar 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Bhuj\\Bhuj 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Godhara\\Godhara 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Himmatnagar\\Himmatnagar 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Jamnagar\\Jamnagar 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Junagadh\\Junagadh 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Mehsana\\Mehsana 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Nadiad\\Nadiad 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Palanpur\\Palanpur 2024-25 Master sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Rajkot\\Rajkot 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Surat\\Surat 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Vadodara\\Vadodara 2024-25 Master Sheet.xls",
  "D:\\Office\\Jay\\Master DTP\\Valsad\\Valsad 2024-25 Master Sheet .xls",
];

function extractDivision(filePath: string): string {
  const folder = path.basename(path.dirname(filePath));
  return folder;
}

async function importFile(filePath: string): Promise<{ division: string; imported: number; skipped: number }> {
  const division = extractDivision(filePath);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["Master Sheet"];
  if (!ws) throw new Error(`Sheet 'Master Sheet' not found in ${filePath}`);

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  const dataRows = rows.slice(3).filter((r) => r[1] && r[4] && r[7]);

  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const itemCode = String(row[1] || "").trim();
    const sorCode  = String(row[2] || "").trim();
    const chapter  = String(row[3] || "").trim() || "General";
    const description = String(row[4] || "").trim();
    const unit     = String(row[6] || "").trim();
    const rateRaw  = row[7];
    const rate     = typeof rateRaw === "number" ? rateRaw : parseFloat(String(rateRaw).replace(/,/g, "")) || 0;

    if (!itemCode || !description || !unit) { skipped++; continue; }

    try {
      await prisma.sORItem.create({
        data: {
          itemCode,
          description,
          unit,
          rate,
          chapter,
          subChapter: sorCode || undefined,
          division,
          sorYear: SOR_YEAR,
          sortOrder: imported + 1,
          isActive: true,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return { division, imported, skipped };
}

async function main() {
  console.log("🗑  Deleting all existing SOR items...");
  const deleted = await prisma.sORItem.deleteMany({});
  console.log(`   Deleted ${deleted.count} items\n`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of FILES) {
    process.stdout.write(`📥 Importing ${extractDivision(file)}...`);
    try {
      const { division, imported, skipped } = await importFile(file);
      totalImported += imported;
      totalSkipped += skipped;
      console.log(` ✓ ${imported} items${skipped ? ` (${skipped} skipped)` : ""}`);
    } catch (e: unknown) {
      console.log(` ✗ ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n✅ All done!  Total imported: ${totalImported}  Skipped: ${totalSkipped}`);
  console.log(`   ${FILES.length} divisions × ${SOR_YEAR}`);
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
