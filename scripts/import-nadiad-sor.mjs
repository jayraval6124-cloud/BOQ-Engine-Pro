/**
 * Import Nadiad Division SOR data from Master Sheet
 * Columns: No | Item Code | SOR Code | Type Of Work | Description | Qty | Unit | Rate Rs. | ...
 * Indexes:  0     1           2           3               4            5     6       7
 */

import pkg from "xlsx";
import { PrismaClient } from "@prisma/client";

const { readFile, utils } = pkg;
const prisma = new PrismaClient();

const FILE   = "D:/Office/Jay/Master DTP/Nadiad/Nadiad 2024-25 Master Sheet.xls";
const SHEET  = "Master Sheet";
const DIVISION = "Nadiad";
const SOR_YEAR = "2024-25";

async function main() {
  console.log("Reading:", FILE);
  const wb   = readFile(FILE);
  const ws   = wb.Sheets[SHEET];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Data starts from row 3 (index 3), row 2 is header
  const dataRows = rows.slice(3).filter((r) => typeof r[1] === "string" && r[1].startsWith("RJ"));

  console.log(`Found ${dataRows.length} RJ items in Master Sheet`);

  let created = 0, updated = 0, skipped = 0;

  for (const row of dataRows) {
    const itemCode   = String(row[1]).trim();          // RJ001 etc.
    const sorCode    = String(row[2]).trim();          // e.g. 20003B
    const chapter    = String(row[3]).trim() || "General";
    const description = String(row[4]).trim();
    const unit       = String(row[6]).trim() || "Nos";
    const rate       = parseFloat(row[7]) || 0;

    if (!itemCode || !description) { skipped++; continue; }

    try {
      const existing = await prisma.sORItem.findFirst({
        where: { itemCode, division: DIVISION, sorYear: SOR_YEAR },
      });

      if (existing) {
        await prisma.sORItem.update({
          where: { id: existing.id },
          data: {
            description,
            unit,
            rate,
            chapter,
            subChapter: itemCode,   // RJ code is the GSRTC lookup key
            category:   sorCode || undefined,
            isActive:   true,
            deletedAt:  null,
          },
        });
        updated++;
      } else {
        await prisma.sORItem.create({
          data: {
            itemCode,
            description,
            unit,
            rate,
            chapter,
            subChapter: itemCode,   // RJ code is the GSRTC lookup key
            category:   sorCode || undefined,
            division:   DIVISION,
            sorYear:    SOR_YEAR,
            isActive:   true,
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`  ERROR on ${itemCode}:`, err.message);
      skipped++;
    }
  }

  console.log(`\nDone! Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);

  // Verify RJ289 and RJ290
  const rj289 = await prisma.sORItem.findFirst({ where: { itemCode: "RJ289", division: DIVISION } });
  const rj290 = await prisma.sORItem.findFirst({ where: { itemCode: "RJ290", division: DIVISION } });
  console.log("\nRJ289:", rj289 ? `✓ ${rj289.description.slice(0, 60)}...` : "✗ NOT FOUND");
  console.log("RJ290:", rj290 ? `✓ ${rj290.description.slice(0, 60)}...` : "✗ NOT FOUND");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
