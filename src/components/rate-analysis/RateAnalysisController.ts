import { useState, useEffect, useCallback } from "react";
import { ComparisonItem, RateAnalysisComponent, SORItem, AnalysisType } from "./RateAnalysisModel";
import { BOQImportService } from "../../lib/services/BOQImportService";
import { RateAnalysisExportService } from "../../lib/services/RateAnalysisExportService";

export function useRateAnalysisController(projectId?: string) {
  const [divisions, setDivisions] = useState<string[]>([]);
  const [sorYears] = useState<string[]>(["2024-25", "2023-24"]); // Usually fetched or hardcoded based on DB
  
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [itemSearchText, setItemSearchText] = useState("");
  
  const [sorItems, setSorItems] = useState<SORItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  
  // Current active item being edited
  const [activeItem, setActiveItem] = useState<ComparisonItem | null>(null);

  // Global settings for Above/Below
  const [globalAboveBelowType, setGlobalAboveBelowType] = useState<AnalysisType>("Below");
  const [globalAboveBelowPercent, setGlobalAboveBelowPercent] = useState<number>(0);

  const [projectName, setProjectName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch divisions on load
    fetch("/api/sor?limit=1")
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => {
        if (data.divisions) setDivisions(data.divisions);
      })
      .catch(console.error);
      
    if (projectId) {
      fetch(`/api/rate-analysis-projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.projectName) setProjectName(data.projectName);
          if (data.agencyName) setAgencyName(data.agencyName);
          if (data.items) {
            setComparisonItems(data.items);
            if (data.items.length > 0) setActiveItem(data.items[0]);
          }
          if (data.globalSettings) {
            setGlobalAboveBelowType(data.globalSettings.aboveBelowType || "Below");
            setGlobalAboveBelowPercent(data.globalSettings.aboveBelowPercent || 0);
          }
        })
        .catch(console.error);
    }
  }, [projectId]);

  const saveProject = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const payload = {
        projectName,
        agencyName,
        items: comparisonItems,
        globalSettings: {
          aboveBelowType: globalAboveBelowType,
          aboveBelowPercent: globalAboveBelowPercent
        }
      };
      
      const res = await fetch(`/api/rate-analysis-projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save project");
      alert("Project saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Error saving project.");
    } finally {
      setIsSaving(false);
    }
  };

  const searchSorItems = useCallback(async (code: string) => {
    if (!selectedDivision || !selectedYear || !code) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/sor?division=${selectedDivision}&sorYear=${selectedYear}&search=${code}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSorItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  }, [selectedDivision, selectedYear]);

  const selectSorItem = async (item: SORItem) => {
    await addMultipleCodes([item.itemCode]);
  };

  const addMultipleCodes = async (codes: string[], importData?: { [code: string]: { qty: number, tenderRate: number, totalAmount?: number, itemNumber?: string } }) => {
    if (!codes.length) return;
    setLoadingItems(true);

    try {
      const res = await fetch(`/api/rate-analysis/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gsrtcCodes: codes,
          divisionName: selectedDivision,
          sorYear: selectedYear
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error("Failed to fetch bulk items: " + errText);
      }

      const data = await res.json();
      const fetchedItems: any[] = data.items || [];

      const newComparisonItems: ComparisonItem[] = [];

      codes.forEach((code, index) => {
        const dbItem = fetchedItems.find(item => item.itemCode === code);
        if (!dbItem) return;

        // Skip if already in comparison table and we are not doing a bulk import mapping
        if (!importData && comparisonItems.some(c => c.gsrtcCode === dbItem.itemCode)) return;

        const importInfo = importData?.[dbItem.itemCode] || { qty: 1, tenderRate: Number(dbItem.rate) };
        const qty = importInfo.qty;
        const tenderRate = importInfo.tenderRate;
        
        // Auto-assign sequential item numbers for manual bulk add
        const autoItemNumber = !importData ? (comparisonItems.length + newComparisonItems.length + 1).toString() : importInfo.itemNumber;
        
        const percent = globalAboveBelowPercent / 100;
        const agencyRate = globalAboveBelowType === "Above" 
          ? tenderRate * (1 + percent) 
          : tenderRate * (1 - percent);

        let components: RateAnalysisComponent[] = [];
        if (dbItem.rateAnalyses && dbItem.rateAnalyses.length > 0 && dbItem.rateAnalyses[0].components) {
          components = dbItem.rateAnalyses[0].components.map((c: any) => ({
            id: c.id,
            type: c.type,
            description: c.description,
            unit: c.unit || "LS",
            quantity: Number(c.quantity),
            rate: Number(c.rate),
            amount: Number(c.amount)
          }));
        }

        const analysisCost = components.reduce((sum, c) => sum + c.amount, 0);

        newComparisonItems.push({
          id: Math.random().toString(36).substring(7),
          itemNumber: autoItemNumber,
          gsrtcCode: dbItem.itemCode,
          description: dbItem.description,
          boqQty: qty,
          unit: dbItem.unit,
          sorRate: Number(dbItem.rate),
          tenderRate: tenderRate,
          tenderAmount: importInfo.totalAmount || (qty * tenderRate),
          agencyRate: agencyRate,
          agencyAmount: agencyRate * qty,
          analysisCost: analysisCost,
          difference: agencyRate - analysisCost,
          profitLoss: agencyRate - analysisCost,
          components: components,
          aboveBelowType: globalAboveBelowType,
          aboveBelowPercent: globalAboveBelowPercent
        });
      });

      if (newComparisonItems.length > 0) {
        setComparisonItems(prev => [...prev, ...newComparisonItems]);
        setActiveItem(newComparisonItems[0]); // optionally set the first added item as active
      }
    } catch (e) {
      console.error("Bulk add failed", e);
    } finally {
      setLoadingItems(false);
    }
  };

  const updateActiveItem = (updates: Partial<ComparisonItem>) => {
    if (!activeItem) return;
    const updated = { ...activeItem, ...updates };
    
    // Recalculate analysis cost if components change
    if (updates.components) {
      updated.analysisCost = updates.components.reduce((sum, c) => sum + c.amount, 0);
    }
    
    // Recalculate diff & profit/loss
    updated.difference = updated.agencyRate - updated.analysisCost;
    updated.profitLoss = updated.difference;

    setActiveItem(updated);
    setComparisonItems(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const updateGlobalAboveBelow = (type: AnalysisType, percent: number) => {
    setGlobalAboveBelowType(type);
    setGlobalAboveBelowPercent(percent);

    const updatedItems = comparisonItems.map(item => {
      const p = percent / 100;
      const agencyRate = type === "Above" 
        ? item.tenderRate * (1 + p) 
        : item.tenderRate * (1 - p);
      
      const qty = item.boqQty || 1;

      return {
        ...item,
        agencyRate: agencyRate,
        agencyAmount: agencyRate * qty,
        difference: agencyRate - item.analysisCost,
        profitLoss: agencyRate - item.analysisCost,
        aboveBelowType: type,
        aboveBelowPercent: percent
      };
    });
    
    setComparisonItems(updatedItems);
    
    if (activeItem) {
      const updatedActive = updatedItems.find(i => i.id === activeItem.id);
      if (updatedActive) setActiveItem(updatedActive);
    }
  };

  const addComponent = (type: RateAnalysisComponent["type"]) => {
    if (!activeItem) return;
    const newComp: RateAnalysisComponent = {
      type,
      description: "",
      unit: "",
      quantity: 1,
      rate: 0,
      amount: 0
    };
    updateActiveItem({ components: [...activeItem.components, newComp] });
  };

  const updateComponent = (index: number, field: keyof RateAnalysisComponent, value: any) => {
    if (!activeItem) return;
    const comps = [...activeItem.components];
    const comp = { ...comps[index], [field]: value };
    if (field === "quantity" || field === "rate") {
      comp.amount = comp.quantity * comp.rate;
    }
    comps[index] = comp;
    updateActiveItem({ components: comps });
  };
  
  const removeComponent = (index: number) => {
    if (!activeItem) return;
    const comps = [...activeItem.components];
    comps.splice(index, 1);
    updateActiveItem({ components: comps });
  };

  const handleImport = async (file: File) => {
    try {
      const isCsv = file.name.endsWith('.csv');
      const rows = isCsv ? await BOQImportService.importCSV(file) : await BOQImportService.importExcel(file);
      
      const codesToFetch = rows.map(r => r.gsrtcCode).filter(Boolean);
      
      const importDataMap: any = {};
      rows.forEach(r => {
        if (r.gsrtcCode) {
          importDataMap[r.gsrtcCode] = {
            itemNumber: r.itemNumber,
            qty: r.quantity || 1,
            tenderRate: r.rate || 0,
            totalAmount: r.totalAmount
          };
        }
      });

      await addMultipleCodes(codesToFetch, importDataMap);
    } catch (e) {
      alert("Error importing file: " + e);
    }
  };

  const exportExcel = () => {
    RateAnalysisExportService.exportToExcel(comparisonItems, projectName || "YOUR PROJECT NAME", agencyName || "YOUR AGENCY NAME");
  };

  const exportPDF = () => {
    RateAnalysisExportService.exportToPDF(comparisonItems, projectName || "YOUR PROJECT NAME", agencyName || "YOUR AGENCY NAME");
  };

  return {
    divisions, sorYears,
    selectedDivision, setSelectedDivision,
    selectedYear, setSelectedYear,
    itemSearchText, setItemSearchText,
    sorItems, searchSorItems, loadingItems,
    comparisonItems, setComparisonItems,
    activeItem, setActiveItem, selectSorItem, updateActiveItem,
    addComponent, updateComponent, removeComponent,
    handleImport, exportExcel, exportPDF, addMultipleCodes,
    globalAboveBelowType, globalAboveBelowPercent, updateGlobalAboveBelow,
    projectName, setProjectName, agencyName, setAgencyName,
    saveProject, isSaving, projectId
  };
}
