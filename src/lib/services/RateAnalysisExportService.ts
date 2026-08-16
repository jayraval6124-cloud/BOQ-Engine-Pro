import ExcelJS from "exceljs";
import { ComparisonItem, RateAnalysisComponent } from "../../components/rate-analysis/RateAnalysisModel";

export class RateAnalysisExportService {
  static async exportToExcel(comparisonItems: ComparisonItem[], projectName: string = "YOUR PROJECT NAME", agencyName: string = "YOUR AGENCY NAME") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BOQ Engine Pro";
    
    // ─── Sheet 1: Summary ───
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "", key: "col1", width: 30 },
      { header: "", key: "col2", width: 50 },
    ];
    
    summarySheet.addRow({ col1: "RATE ANALYSIS SUMMARY" }).font = { bold: true, size: 14 };
    summarySheet.addRow({});
    summarySheet.addRow({ col1: "NAME OF WORK:", col2: projectName }).font = { bold: true };
    summarySheet.addRow({ col1: "NAME OF AGENCY:", col2: agencyName }).font = { bold: true };
    summarySheet.addRow({});
    
    let totalTender = 0;
    let totalAgency = 0;
    comparisonItems.forEach(item => {
      totalTender += (item.tenderAmount || 0);
      totalAgency += (item.agencyAmount || 0);
    });
    
    summarySheet.addRow({ col1: "Total Tender Amount (Rs.):", col2: Number(totalTender.toFixed(2)) });
    summarySheet.addRow({ col1: "Total Agency Amount (Rs.):", col2: Number(totalAgency.toFixed(2)) });
    
    const diff = totalAgency - totalTender;
    const diffPercent = totalTender > 0 ? (diff / totalTender) * 100 : 0;
    const aboveBelowStr = diff >= 0 ? `${diffPercent.toFixed(2)}% Above` : `${Math.abs(diffPercent).toFixed(2)}% Below`;
    
    summarySheet.addRow({ col1: "Overall % Above/Below:", col2: aboveBelowStr }).font = { bold: true, color: { argb: diff >= 0 ? 'FFFF0000' : 'FF00B050' } };
    summarySheet.addRow({});
    
    // Optionally list items in summary
    summarySheet.addRow({ col1: "Item No", col2: "Amount (Rs.)" }).font = { bold: true, underline: true };
    comparisonItems.forEach(item => {
      summarySheet.addRow({ col1: `Item No: ${item.itemNumber || '-'}`, col2: Number((item.agencyAmount || 0).toFixed(2)) });
    });

    // ─── Sheet 2: Rate Analysis ───
    const analysisSheet = workbook.addWorksheet("Rate Analysis");
    analysisSheet.columns = [
      { header: "Item No.", key: "itemNo", width: 12 },
      { header: "Description", key: "desc", width: 60 },
      { header: "Qty", key: "qty", width: 12 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Rate", key: "rate", width: 15 },
      { header: "Total Rs.", key: "amount", width: 15 },
    ];
    
    // Add header rows for Project/Agency in Rate Analysis Sheet as well
    analysisSheet.insertRow(1, { itemNo: "RATE ANALYSIS" });
    analysisSheet.getRow(1).font = { bold: true, size: 12 };
    analysisSheet.insertRow(2, { itemNo: "NAME OF WORK:", desc: projectName });
    analysisSheet.getRow(2).font = { bold: true };
    analysisSheet.insertRow(3, { itemNo: "NAME OF AGENCY:", desc: agencyName });
    analysisSheet.getRow(3).font = { bold: true };
    analysisSheet.insertRow(4, {});
    
    // The headers got pushed down by 4 rows, so we need to set font for the new header row (row 5)
    analysisSheet.getRow(5).font = { bold: true };
    analysisSheet.getColumn('desc').alignment = { wrapText: true, vertical: 'top' };
    
    comparisonItems.forEach((item, index) => {
      let originalSubtotal = 0;
      item.components.forEach(c => { originalSubtotal += c.amount; });
      const totalRs = item.agencyRate;
      const PROFIT_PERCENT = 10;
      const requiredSubtotal = totalRs / (1 + (PROFIT_PERCENT / 100));
      const scaleFactor = originalSubtotal > 0 ? (requiredSubtotal / originalSubtotal) : 1;

      // 1. Add Main Item row
      const mainRow = analysisSheet.addRow({
        itemNo: item.itemNumber || (index + 1).toString(),
        desc: item.description,
        qty: item.boqQty || 1,
        unit: item.unit,
        rate: "",
        amount: ""
      });
      mainRow.font = { bold: true };

      // 2. Add Subcomponents
      let printedSubtotal = 0;
      item.components.forEach(comp => {
        const scaledRate = Number((comp.rate * scaleFactor).toFixed(2));
        const scaledAmount = Number((comp.amount * scaleFactor).toFixed(2));
        printedSubtotal += scaledAmount;

        analysisSheet.addRow({
          itemNo: "",
          desc: comp.description,
          qty: comp.quantity,
          unit: comp.unit,
          rate: scaledRate,
          amount: scaledAmount
        });
      });

      // 3. Add Calculations
      const profitAmt = Number((totalRs - printedSubtotal).toFixed(2));
      
      const totalRow = analysisSheet.addRow({ itemNo: "", desc: "total", qty: "", unit: "", rate: "", amount: printedSubtotal });
      totalRow.getCell('desc').alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
      totalRow.font = { bold: true };
      
      const profitRow = analysisSheet.addRow({ itemNo: "", desc: `profit/overhead ${PROFIT_PERCENT}%`, qty: "", unit: "", rate: "", amount: profitAmt });
      profitRow.getCell('desc').alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
      
      const totalRsRow = analysisSheet.addRow({ itemNo: "", desc: "Total Rs.", qty: "", unit: "", rate: "", amount: Number(totalRs.toFixed(2)) });
      totalRsRow.getCell('desc').alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
      totalRsRow.font = { bold: true };
      
      const sayRsRow = analysisSheet.addRow({ itemNo: "", desc: "Say Rs.", qty: "", unit: "", rate: "", amount: Math.round(totalRs) });
      sayRsRow.getCell('desc').alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
      sayRsRow.font = { bold: true };
      
      // Empty row for spacing
      analysisSheet.addRow({});
    });

    // ─── Sheet 3: SOR Comparison ───
    const comparisonSheet = workbook.addWorksheet("SOR Comparison");
    comparisonSheet.columns = [
      { header: "Item No", key: "itemNo", width: 10 },
      { header: "GSRTC Code", key: "code", width: 15 },
      { header: "Description", key: "desc", width: 50 },
      { header: "BOQ Qty", key: "qty", width: 10 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Tender Rate", key: "tenderRate", width: 15 },
      { header: "Tender Amount", key: "tenderAmt", width: 15 },
      { header: "Agency Rate", key: "agencyRate", width: 15 },
      { header: "Agency Amount", key: "agencyAmt", width: 15 },
    ];
    comparisonSheet.getRow(1).font = { bold: true };
    comparisonItems.forEach(item => {
      comparisonSheet.addRow({
        itemNo: item.itemNumber || "",
        code: item.gsrtcCode,
        desc: item.description,
        qty: item.boqQty || 0,
        unit: item.unit,
        tenderRate: Number((item.tenderRate || 0).toFixed(2)),
        tenderAmt: Number((item.tenderAmount || 0).toFixed(2)),
        agencyRate: Number((item.agencyRate || 0).toFixed(2)),
        agencyAmt: Number((item.agencyAmount || 0).toFixed(2)),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rate_Analysis_${new Date().getTime()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static exportToPDF(comparisonItems: ComparisonItem[], projectName: string = "YOUR PROJECT NAME", agencyName: string = "YOUR AGENCY NAME") {
    // Dynamic import to avoid SSR issues if this runs in Next.js
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc = new jsPDF('landscape');
        
        let totalTenderAmt = 0;
        let totalAgencyAmt = 0;
        comparisonItems.forEach(item => {
          totalTenderAmt += item.tenderAmount || 0;
          totalAgencyAmt += item.agencyAmount || 0;
        });

        const pageWidth = doc.internal.pageSize.getWidth();

        // ==========================================
        // 1. Summary Sheet
        // ==========================================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Name of Work : ${projectName}`, pageWidth / 2, 15, { align: "center" });
        doc.text(`Name Of Agency :- ${agencyName}`, pageWidth / 2, 20, { align: "center" });
        
        doc.text("Summary sheet", pageWidth / 2, 30, { align: "center" });

        const summaryTableData: any[][] = [];
        summaryTableData.push([
          "1",
          "All Works",
          totalTenderAmt.toFixed(2),
          totalAgencyAmt.toFixed(2)
        ]);
        
        summaryTableData.push([
          "",
          "TOTAL :-",
          totalTenderAmt.toFixed(2),
          totalAgencyAmt.toFixed(2)
        ]);

        summaryTableData.push([
          "",
          "SAY :-",
          Math.round(totalTenderAmt).toFixed(2),
          Math.round(totalAgencyAmt).toFixed(2)
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['No.', 'Description', 'Tender Amount (Rs.)', 'Agency Amount (Rs.)']],
          body: summaryTableData,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
          margin: { left: 40, right: 40 },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 50, halign: 'right' },
            3: { cellWidth: 50, halign: 'right' }
          },
          willDrawCell: (data) => {
            if (data.row.index >= 1) { // TOTAL and SAY rows
              doc.setFont("helvetica", "bold");
              if (data.column.index === 1) data.cell.styles.halign = 'right';
            }
          },
        });

        // ==========================================
        // 2. BOQ Comparison Sheet
        // ==========================================
        doc.addPage();
        
        let startY = 15;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`Name of Work : ${projectName}`, pageWidth / 2, startY, { align: "center" });
        doc.text(`Name Of Agency :- ${agencyName}`, pageWidth / 2, startY + 5, { align: "center" });
        
        const boqTableData: any[][] = [];
        comparisonItems.forEach((item, index) => {
          boqTableData.push([
            item.itemNumber || (index + 1).toString(),
            item.gsrtcCode || "",
            item.description,
            item.boqQty?.toFixed(2) || "1.00",
            item.unit,
            (item.tenderRate || 0).toFixed(2),
            (item.tenderAmount || 0).toFixed(2),
            (item.agencyRate || 0).toFixed(2),
            (item.agencyAmount || 0).toFixed(2)
          ]);
        });
        
        boqTableData.push([
          "", "", "Total Rs. :-", "", "", "", totalTenderAmt.toFixed(2), "", totalAgencyAmt.toFixed(2)
        ]);

        autoTable(doc, {
          startY: startY + 10,
          head: [['Item No', 'GSRTC Code', 'Description', 'BOQ Qty', 'Unit', 'Tender Rate', 'Tender Amount', 'Agency Rate', 'Agency Amount']],
          body: boqTableData,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
          margin: { left: 10, right: 10 },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 25, halign: 'right' },
            8: { cellWidth: 25, halign: 'right' }
          },
          willDrawCell: (data) => {
            if (data.row.index === boqTableData.length - 1) { // Total row
              doc.setFont("helvetica", "bold");
              if (data.column.index === 2) data.cell.styles.halign = 'right';
            }
          },
        });

        // ==========================================
        // 3. Rate Analysis Sheet
        // ==========================================
        doc.addPage();
        startY = 15;
        
        comparisonItems.forEach((item, index) => {
          if (index > 0 && startY > 170) { // Landscape has less vertical space (210mm total)
            doc.addPage();
            startY = 15;
          }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          
          if (startY === 15) {
             doc.text(`Name of Work : ${projectName}`, pageWidth / 2, startY, { align: "center" });
             doc.text(`Name Of Agency :- ${agencyName}`, pageWidth / 2, startY + 5, { align: "center" });
             startY += 12;
          }

          const tableData: any[][] = [];
          
          tableData.push([
            item.itemNumber || (index + 1).toString(),
            item.description,
            "1", 
            item.unit,
            "",
            ""
          ]);

          let originalSubtotal = 0;
          item.components.forEach(c => { originalSubtotal += c.amount; });

          const totalRs = item.agencyRate;
          const PROFIT_PERCENT = 10;
          const requiredSubtotal = totalRs / (1 + (PROFIT_PERCENT / 100));
          const scaleFactor = originalSubtotal > 0 ? (requiredSubtotal / originalSubtotal) : 1;

          let printedSubtotal = 0;
          item.components.forEach(c => {
            const scaledRate = c.rate * scaleFactor;
            const scaledAmount = c.amount * scaleFactor;
            tableData.push([
              "",
              c.description,
              c.quantity.toFixed(4),
              c.unit,
              scaledRate.toFixed(2),
              scaledAmount.toFixed(2)
            ]);
            printedSubtotal += scaledAmount;
          });

          const profitAmt = totalRs - printedSubtotal;

          tableData.push(["", "total", "", "", "", printedSubtotal.toFixed(2)]);
          tableData.push(["", `profit/overhead ${PROFIT_PERCENT}%`, "", "", "", profitAmt.toFixed(2)]);
          tableData.push(["", "Total Rs.", "", "", "", totalRs.toFixed(2)]);
          tableData.push(["", "Say Rs.", "", "", "", Math.round(totalRs).toString()]);

          autoTable(doc, {
            startY: startY,
            head: [['Item No.', 'Description', 'Qty', 'Unit', 'Rate', 'Total Rs.']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { left: 10, right: 10 },
            columnStyles: {
              0: { cellWidth: 20 },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 30, halign: 'right' },
              3: { cellWidth: 20, halign: 'center' },
              4: { cellWidth: 35, halign: 'right' },
              5: { cellWidth: 35, halign: 'right' }
            },
            willDrawCell: (data) => {
              if (data.row.index >= item.components.length + 1) {
                doc.setFont("helvetica", "bold");
                if (data.column.index === 1) data.cell.styles.halign = 'right';
              }
            },
          });

          startY = (doc as any).lastAutoTable.finalY + 5;
        });

        doc.save(`Rate_Analysis_Agency_${new Date().getTime()}.pdf`);
      });
    });
  }
}
