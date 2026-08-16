export type AnalysisType = "Above" | "Below";

export interface RateAnalysisComponent {
  id?: string;
  type: "MATERIAL" | "LABOUR" | "MACHINERY" | "TRANSPORT" | "OVERHEAD" | "PROFIT" | "TAX" | "OTHER";
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ComparisonItem {
  id: string; // unique internal id for the UI
  itemNumber?: string;
  gsrtcCode: string;
  description: string;
  boqQty?: number;
  unit: string;
  sorRate: number;
  tenderRate: number;
  tenderAmount?: number;
  agencyRate: number;
  agencyAmount?: number;
  analysisCost: number;
  difference: number;
  profitLoss: number;
  components: RateAnalysisComponent[];
  aboveBelowType: AnalysisType;
  aboveBelowPercent: number;
}

export interface SORItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  rate: number;
  division: string;
  sorYear: string;
}
