"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectOption { id: string; name: string; projectNo: string; sorDivision: string; sorYear: string; }
interface BOQSummary    { id: string; name: string; subWork: string; boqNo: string; totalAmount: string; }

interface BOQItemFull {
  id: string; gsrtcCode: string | null; itemCode: string | null;
  description: string; quantity: number | string; unit: string;
  rate: number | string | null; chapter: string; sortOrder: number;
  sorItem?: {
    itemCode: string; cementConsumption: string | number | null;
    steelConsumption: string | number | null; materialDescription: string | null;
    sandRatio: string | number | null; aggregateRatio: string | number | null;
    qtyPerTrip: string | number | null;
  } | null;
}

interface ProjectFull { id: string; name: string; projectNo: string; sorDivision?: string; sorYear?: string; }

interface SpecSection { title: string; description: string; subsections: unknown[]; }
interface ItemSpec { Item_Code: string; Description: string; sections: SpecSection[]; }

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STEEL_CODES = ["RJ080", "RJ081", "RJ082"];
const FONT = '"Times New Roman", Times, serif';

const PRICE_ADJ = [
  { sub: "( A )", label: "Labour, PL",                    clause: "Section 4 cl. 24 (i)",   page: "66", prefix: "PL =", val: "38"   },
  { sub: "( B )", label: "Cement, Pc",                    clause: "Section 4 cl. 24 (ii)",  page: "66", prefix: "Pc =", val: "17.5"  },
  { sub: "( C )", label: "Steel, Ps",                     clause: "Section 4 cl. 24 (iii)", page: "67", prefix: "Ps =", val: "15.8"  },
  { sub: "( D )", label: "Bitumen, Pb",                   clause: "Section 4 cl. 24 (iv)",  page: "67", prefix: "Pb =", val: "0"     },
  { sub: "( E )", label: "POL, Pf",                       clause: "Section 4 cl. 24 (v)",   page: "68", prefix: "Pf =", val: "1"     },
  { sub: "( F )", label: "Plant and Machinery Spares Pp", clause: "Section 4 cl. 24 (vi)",  page: "68", prefix: "Pp =", val: "10"    },
  { sub: "( G )", label: "Other Materials, Pm",           clause: "Section 4 cl. 24 (vii)", page: "69", prefix: "Pm =", val: "17.7"  },
];

const MILESTONES = [
  { sub: "( A )", label: "Milestone 1", pct: "25",  days: "75"  },
  { sub: "( B )", label: "Milestone 2", pct: "50",  days: "140" },
  { sub: "( C )", label: "Milestone 3", pct: "75",  days: "205" },
  { sub: "( D )", label: "Milestone 4", pct: "100", days: "270" },
];

const SUMMARY_NOTES = [
  "All work shall be carried out as per Public Works Department handbook and other specification of division or as directed.",
  "All the columns in schedule should be filled in ink and the total of the entries in the last column should be struck by the contractor under his signature.",
  "Rates quoted include clearance of site [Prior commencement of work and at its close] in all respects and hold good for work under all conditions, site moisture, weather etc.",
  "To be continued on additional sheets, if found necessary.",
  "Additional GST will be paid to Agencies on bill amount as per the Standard Bidding Document.",
  "2 % Cash Discount on each running bill will be deducted from Agency Bill. (Please refer Cash Discount & GST Condition as attached in Tender Document)",
  "Salvage amount will be deducted from Agency Bill as per Annexure Attached in Tender Document :- 86,400.00",
];

const PROFORMA_SECTIONS = [
  { no: "1.", title: "TENDER  FORM  :-", items: [
    { n: "i)",   q: "Where the old clauses are replaced by the latest clauses as for Government instruction ?", a: "Revised printed form is used, hence question does not arrise." },
    { n: "ii)",  q: "If so, state the number wise details of clauses replaced.", a: "-- do --" },
    { n: "iii)", q: "Whether time limit is entered ?  Is it in proportion with the amount and nature of work ?", a: "Yes" },
    { n: "iv)",  q: "Whether the correct name of work as per sanctioned estimate is entered ?", a: "Yes" },
    { n: "v)",   q: "Whether the order details vix. mention of security deposit etc. are written in the tender form ?", a: "Yes" },
  ]},
  { no: "2.", title: 'SCHEDULE  "A"  :-', items: [
    { n: "i)",   q: "Whether Schedule 'A' gives details of the material to be supplied by the Department ?", a: "N.A." },
    { n: "ii)",  q: "Does it mention the correct place of delivery of materials to be supplied under Schedule 'A' ?", a: "N.A." },
    { n: "iii)", q: "Whether the rates of materials are mentioned in the figures as well as in the words ?", a: "N.A." },
    { n: "iv)",  q: "Whether the rate entered in Schedule 'A' is correctly derived ?", a: "N.A." },
    { n: "v)",   q: "Whether quantity of materials is correctly arrived at as per norms ?", a: "N.A." },
  ], footerNote: "I have personally verified the facts as stated above and found in order." },
  { no: "3.", title: "BILL OF QUANTITY  :-", items: [
    { n: "i)",    q: "Whether the description of each item literally tally with the sanctioned estimates except specifying of leads and lifts etc.", a: "Yes" },
    { n: "ii)",   q: "Whether quantity of each item is as per sanctioned estimate ? If not, justification for deviation in covering letter of the S.B.D.", a: "Yes" },
    { n: "iii)",  q: "Whether the rate for each item is as per sanctioned estimate ? If not, state the reasons with justification for deviation in covering letter of the Analysis in the S.B.D.", a: "Yes" },
    { n: "iv)",   q: "Whether the unit of each item is as per sanctioned estimate ? If not, state the reasons with due justification for deviation in covering letter of the S.B.D.", a: "Yes" },
    { n: "v)",    q: "Whether the rate of each item in Bill of Quantity is mentioned in words, in case of % rate tender ?", a: "Yes" },
    { n: "vi)",   q: "What are the standard method is adopted in each item in writing the unit ? (e.g. Cubic Meter to be abbreviated as per Cum. and not C.M. etc.)", a: "Yes, as per Std." },
    { n: "vii)",  q: "Whether the Govt. remarks if any observed at the time of according sanction are fully incorporated in the S.B.D. ? If so, submit the compliance report.", a: "Yes" },
    { n: "viii)", q: "Whether correct name of work is entered at the top of Bill of Quantity ?", a: "Yes" },
    { n: "ix)",   q: "Whether standard form for Bill of Quantity is adopted ?", a: "Yes" },
    { n: "x)",    q: 'Whether the standard words for discount of premium on tendered rate as "I/We am/are ……" is mentioned at the end ?', a: "Yes" },
    { n: "xi)",   q: "Whether the amount worked out for each item is correctly calculated and summed up ?", a: "Yes" },
    { n: "xii)",  q: "Whether alternate item are proposed in the S.B.D. ? If so, state the item no. for which alternate item is proposed with the reasons.", a: "No any alternative item." },
  ]},
  { no: "4.", title: "DETAILED  SPECIFICATION  :-", items: [
    { n: "i)",    q: "Whether the detailed specification correctly reflect the tender item ?", a: "Yes" },
    { n: "ii)",   q: "Whether items with specified lead and lift are converted into with all leads and lifts ?", a: "Yes" },
    { n: "iii)",  q: "Whether the correct mode of measurement is mentioned ?", a: "Yes" },
    { n: "iv)",   q: "Whether correct mode of payment is as per Bill of Quantity ?", a: "Yes" },
    { n: "v)",    q: "Whether suitable use of excavated material or cutting stuff is incorporated in the S.B.D. ?", a: "Yes" },
    { n: "vi)",   q: "Whether the mentioned regarding the tests to be carried out before execution is made in the respective item of S.B.D. ? If so, state the Item No. with description and details of tests to be carried out in brief.", a: "Testing schedule is attached" },
    { n: "vii)",  q: "Whether the mentioned regarding the tests to be carried out during execution is made ? State the item no. with description and details of tests to be carried out in brief.", a: "Testing schedule is attached" },
    { n: "viii)", q: "Whether reference to P.W.D. Hand Book, I.S. Specification or I.R.C. Clauses are mentioned correctly and relevantly in the respective item ?", a: "Yes" },
    { n: "ix)",   q: "Whether average rate of earthwork is derived and entered in Bill of Quantity ? If so, give Rate Analysis.", a: "Not Applicable" },
    { n: "x)",    q: "Whether the specification of alternative item, if any, is incorporated ?", a: "Not Applicable" },
    { n: "xi)",   q: "Whether the description of each item literally and exactly talleys with that in Bill of Quantity.", a: "Yes" },
  ]},
  { no: "5.", title: "G E N E R A L  :-", items: [
    { n: "i)",    q: "Whether statement of items not put to tender is incorporated with detailed justification ?", a: "Yes" },
    { n: "ii)",   q: "Whether the amount of sanctioned estimates tally with the total of amount put to tender and amount of items not put to tender ?", a: "Yes" },
    { n: "iii)",  q: "Whether page numbering in S.B.D. is made ?", a: "Yes" },
    { n: "iv)",   q: "Whether permission to split up the work, if any, is sought from competent authority ?", a: "Not Applicable" },
    { n: "v)",    q: "Whether the general specifications and other relevant records are incorporated in the S.B.D. ?", a: "Yes" },
    { n: "vi)",   q: "Whether Executive Engineer has signed the S.B.D. and all corrections are duly attested by him ?", a: "Yes" },
    { n: "vii)",  q: "Whether the S.B.D. are submitted in well bound volume and in neat and tidy fashion ?", a: "Yes" },
  ]},
];

const PROFORMA_CERTIFICATE = "I have personally examined the S.B.D. and I have personally verified all the above points and found to be in order. Further I have satisfied myself with the fact that there is no ambiguity or discrepancy, in the S.B.D. submitted herewith, which may lead to financial or contractual implications.";

// ── Number to Words (Indian currency) ────────────────────────────────────────
const ONES_W = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                "Seventeen", "Eighteen", "Nineteen"];
const TENS_W = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function sayNum(n: number): string {
  if (n === 0) return "";
  if (n < 20)  return ONES_W[n];
  if (n < 100) return TENS_W[Math.floor(n / 10)] + (n % 10 ? " " + ONES_W[n % 10] : "");
  if (n < 1000)    return ONES_W[Math.floor(n / 100)] + " Hundred"    + (n % 100    ? " " + sayNum(n % 100)    : "");
  if (n < 100000)  return sayNum(Math.floor(n / 1000))   + " Thousand" + (n % 1000   ? " " + sayNum(n % 1000)   : "");
  if (n < 10000000)return sayNum(Math.floor(n / 100000)) + " Lakh"     + (n % 100000 ? " " + sayNum(n % 100000) : "");
  return              sayNum(Math.floor(n / 10000000))   + " Crore"    + (n % 10000000 ? " " + sayNum(n % 10000000) : "");
}
function toRupeesWords(n: number): string {
  if (isNaN(n) || n === 0) return "";
  const rupees = Math.floor(n);
  const paise  = Math.round((n - rupees) * 100);
  let result = "Rupees " + sayNum(rupees);
  if (paise > 0) result += " And Paise " + sayNum(paise);
  return result + " Only";
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const TH: React.CSSProperties  = { border: "1px solid #000", padding: "3px 4px", fontWeight: "bold", fontSize: 8.5, textAlign: "center", verticalAlign: "middle", background: "#f5f5f5" };
const TD: React.CSSProperties  = { border: "1px solid #000", padding: "2px 4px", fontSize: 8, verticalAlign: "top" };
const TDc: React.CSSProperties = { ...TD, textAlign: "center", verticalAlign: "middle" };
const TDr: React.CSSProperties = { ...TD, textAlign: "right",  verticalAlign: "middle" };
const TDB: React.CSSProperties = { ...TD, fontWeight: "bold" };
const TDBr: React.CSSProperties = { ...TDr, fontWeight: "bold" };
const PAGE: React.CSSProperties = { width: 760, background: "#fff", fontFamily: FONT, padding: "24px 32px", boxSizing: "border-box" };

const PRINT_STYLE = `
  @page         { size: A4 portrait;  margin: 0; }
  @page wide    { size: A4 landscape; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: white;
    font-family: "Times New Roman", Times, serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  input {
    border: none !important; background: transparent !important;
    padding: 0 !important; font: inherit; text-align: right; width: 100%; outline: none;
  }
  .no-print  { display: none !important; }
  .page-break { page-break-before: always !important; break-before: page !important; }
  /* Landscape BOQ: scale 1050 → ≈760 so it fits portrait A4 at 72% */
  .dtp-boq-wide { zoom: 0.715; width: 1050px !important; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fmtN(n: number, dec = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function parseN(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}
function pct(part: number, total: number, dec = 3): string {
  return total ? ((part / total) * 100).toFixed(dec) : (0).toFixed(dec);
}
function getCode(item: BOQItemFull): string {
  return (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "").toUpperCase().trim();
}

// Orange header band — matches real GSRTC DTP format
function SecHeader({ now }: { now: string }) {
  return (
    <div style={{ background: "#FFF5E6", border: "1px solid #DDB870", padding: "6px 12px", marginBottom: 8, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: "bold" }}>G.S.R.T.C. Central Office Ranip, Ahmedabad</div>
      <div style={{ fontSize: 9, marginTop: 2 }}><strong>Name Of Work :-</strong>&nbsp;{now || "—"}</div>
    </div>
  );
}

// Standard GSRTC signature row at bottom of each section
function SigRow() {
  return (
    <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", fontFamily: FONT }}>
      {[
        ["Dy.Engg.(Tech.)", "GSRTC, C.O.,A'bad"],
        ["Executive Engineer", "GSRTC,C.O.,A'bad"],
        ["Chief Civil Engineer", "GSRTC,C.O.,A'bad"],
      ].map(([title, sub]) => (
        <div key={title} style={{ textAlign: "center", width: "30%" }}>
          <div style={{ height: 36 }} />
          <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 8.5, fontWeight: "bold" }}>{title}</div>
          <div style={{ fontSize: 8, marginTop: 2 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function GenerateDTPPage() {
  const [projects,  setProjects]  = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project,   setProject]   = useState<ProjectFull | null>(null);
  const [boqList,   setBoqList]   = useState<BOQSummary[]>([]);
  const [allBoqs,   setAllBoqs]   = useState<BOQSummary[]>([]);
  const [boqId,     setBoqId]     = useState("");
  const [boqItems,  setBoqItems]  = useState<BOQItemFull[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [itemSpecs, setItemSpecs] = useState<Map<string, ItemSpec>>(new Map());

  // DTP Settings
  const [now,        setNow]        = useState("");
  const [budgetNo,   setBudgetNo]   = useState("");
  const [yr,         setYr]         = useState("2026-27");
  const [tenderFee,  setTenderFee]  = useState("500");
  const [timeLimit,  setTimeLimit]  = useState("6 Months");
  const [cR,         setCR]         = useState("");
  const [sR,         setSR]         = useState("");
  const [saR,        setSaR]        = useState("");
  const [agR,        setAgR]        = useState("");
  const [division,   setDivision]   = useState("");
  const [sorYear,    setSorYear]    = useState("2024-25");
  const [dieselRate, setDieselRate] = useState("90.25");
  const [oilRate,    setOilRate]    = useState("350.00");
  const [kmPerLitre, setKmPerLitre] = useState("4.0");
  const [avgLead,    setAvgLead]    = useState("25");
  const [plantPct,   setPlantPct]   = useState("25");

  useEffect(() => {
    fetch("/api/projects?limit=100").then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) { setBoqList([]); setAllBoqs([]); setBoqId(""); setLoaded(false); setBoqItems([]); return; }
    fetch(`/api/boq?projectId=${projectId}`).then((r) => r.json())
      .then((data: BOQSummary[]) => {
        if (!Array.isArray(data)) return;
        setAllBoqs(data);
        const civil = data.filter((b) => !b.subWork || b.subWork === "Civil");
        setBoqList(civil);
        if (civil.length === 1) setBoqId(civil[0].id);
      }).catch(() => {});
  }, [projectId]);

  const loadAll = useCallback(async () => {
    if (!boqId) return;
    setLoading(true); setLoaded(false); setBoqItems([]); setItemSpecs(new Map());
    try {
      const res = await fetch(`/api/boq/${boqId}`);
      if (!res.ok) return;
      const data = JSON.parse(await res.text());
      if (!data?.items) return;
      const items: BOQItemFull[] = data.items;
      setBoqItems(items);
      setProject(data.project ?? null);
      if (!now && data.project?.name) setNow(data.project.name);
      if (data.project?.sorDivision) setDivision(data.project.sorDivision);
      if (data.project?.sorYear)    setSorYear(data.project.sorYear);
      // Fetch detailed specifications for item codes used in this BOQ
      const codes = [...new Set(
        items.map((i) => getCode(i)).filter((c) => c.startsWith("RJ") || c.startsWith("MR"))
      )];
      if (codes.length > 0) {
        fetch(`/api/item-specs?codes=${codes.join(",")}`)
          .then((r) => r.json())
          .then((specs: ItemSpec[]) => {
            const m = new Map<string, ItemSpec>();
            for (const s of specs) m.set(s.Item_Code.toUpperCase(), s);
            setItemSpecs(m);
          })
          .catch(() => {});
      }
    } finally { setLoaded(true); setLoading(false); }
  }, [boqId, now]);

  const [ratesLoading, setRatesLoading] = useState(false);
  const loadMaterialRates = useCallback(async () => {
    if (!division) return;
    setRatesLoading(true);
    try {
      const div  = encodeURIComponent(division);
      const year = encodeURIComponent(sorYear || "2024-25");
      const [ci, sti, si, ai] = await Promise.all([
        fetch(`/api/sor/lookup?code=M143&division=${div}&year=${year}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/sor/lookup?code=M689&division=${div}&year=${year}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/sor/lookup?code=M158&division=${div}&year=${year}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/sor/lookup?code=M176&division=${div}&year=${year}`).then((r) => r.json()).catch(() => null),
      ]);
      if (ci?.rate)  setCR(String(Number(ci.rate)));
      if (sti?.rate) setSR(String(Number(sti.rate) * 10)); // M689 per Quintal → ×10 = per MT
      if (si?.rate)  setSaR(String(Number(si.rate)));
      if (ai?.rate)  setAgR(String(Number(ai.rate)));
    } finally { setRatesLoading(false); }
  }, [division, sorYear]);

  // ── Core calculations ─────────────────────────────────────────────────────────

  const base = useMemo(() => {
    if (!boqItems.length) return null;
    const steelItems    = boqItems.filter((i) => STEEL_CODES.includes(getCode(i)));
    const nonSteelItems = boqItems.filter((i) => !STEEL_CODES.includes(getCode(i)));
    let totalCementKg = 0, totalSteelKg = 0, totalSandCMT = 0, totalAggCMT = 0, boqTotal = 0;
    for (const item of boqItems) {
      const qty = parseN(item.quantity);
      boqTotal     += qty * parseN(item.rate ?? 0);
      totalSandCMT += qty * parseN(item.sorItem?.sandRatio ?? 0);
      totalAggCMT  += qty * parseN(item.sorItem?.aggregateRatio ?? 0);
    }
    for (const item of nonSteelItems) totalCementKg += parseN(item.quantity) * parseN(item.sorItem?.cementConsumption ?? 0);
    for (const item of steelItems)    totalSteelKg  += parseN(item.quantity);
    const materialItems = nonSteelItems.filter((i) =>
      i.sorItem?.materialDescription && parseN(i.sorItem?.cementConsumption ?? 0) === 0 && parseN(i.quantity) > 0,
    );
    return { steelItems, nonSteelItems, materialItems, totalCementKg, totalSteelKg, totalSandCMT, totalAggCMT, boqTotal };
  }, [boqItems]);

  const derived = useMemo(() => {
    if (!base) return null;
    const { totalCementKg, totalSteelKg, totalSandCMT, totalAggCMT, boqTotal, materialItems } = base;
    const cementMT = totalCementKg / 1000, steelMT = totalSteelKg / 1000;
    const cRate = parseN(cR), sRate = parseN(sR), sandRate = parseN(saR), aggRate = parseN(agR);
    const lead  = parseN(avgLead) || 25;
    const dRate = parseN(dieselRate) || 1;
    const pp    = (parseN(plantPct) || 25) / 100;

    const cementCost = cementMT * cRate, steelCost  = steelMT  * sRate;
    const sandCost   = totalSandCMT * sandRate, aggCost = totalAggCMT * aggRate;
    const matBCost   = materialItems.reduce((s, i) => s + parseN(i.quantity) * parseN(i.rate ?? 0), 0);

    const B = cementCost + steelCost, C = sandCost + aggCost + matBCost, A = boqTotal, D = A - B;

    const polAItems = [
      { id: "cement", details: "Cement",           qty: cementMT,     unit: "M.T.", qpt: 20, lead, inputRate: cRate },
      { id: "steel",  details: "TMT Steel",         qty: steelMT,      unit: "M.T.", qpt: 20, lead, inputRate: sRate },
    ];
    const polBItems = [
      { id: "sand",   details: "Sand",              qty: totalSandCMT, unit: "CMT",  qpt: 14, lead, inputRate: sandRate },
      { id: "agg",    details: "Kapchi / Aggregate",qty: totalAggCMT,  unit: "CMT",  qpt: 14, lead, inputRate: aggRate  },
      ...materialItems.map((i) => ({
        id: i.id, details: i.sorItem!.materialDescription!,
        qty: parseN(i.quantity), unit: i.unit,
        qpt: parseN(i.sorItem?.qtyPerTrip ?? 14) || 14, lead,
        inputRate: parseN(i.rate ?? 0),
      })),
    ];

    const kmFn   = (qty: number, per: number, l: number) => per > 0 ? (qty / per) * l : 0;
    const polKm  = [...polAItems, ...polBItems].reduce((s, r) => s + kmFn(r.qty, r.qpt, r.lead), 0);

    const E = polKm * dRate;

    const F = A - B - C - E, G = F * pp;

    return { cementMT, steelMT, cementCost, steelCost, sandCost, aggCost, matBCost,
             A, B, C, D, E, F, G, polKm, polAItems, polBItems };
  }, [base, cR, sR, saR, agR, dieselRate, avgLead, plantPct]); // oilRate, kmPerLitre kept in state for potential future use

  // ── Print ────────────────────────────────────────────────────────────────────

  const printAll = () => {
    const el = document.getElementById("dtp-all");
    if (!el) return;

    // Use an iframe so relative URLs (/gsrtc-logo.jpg etc.) resolve via the app's origin
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const idoc = iframe.contentDocument!;
    idoc.open();
    idoc.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>DTP Package</title>
<style>${PRINT_STYLE}</style>
</head><body>${el.innerHTML}</body></html>`);
    idoc.close();

    // Give images ~1.5s to load before triggering print
    setTimeout(() => {
      try {
        iframe.contentWindow!.focus();
        iframe.contentWindow!.print();
      } finally {
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch {}
        }, 2000);
      }
    }, 1500);
  };

  // ── Section renders ───────────────────────────────────────────────────────────

  const emd = derived ? Math.round((derived.A * 0.01) / 10) * 10 : 0;

  const secFront = () => (
    <div style={{ ...PAGE, display: "flex", flexDirection: "column", alignItems: "center", minHeight: 1123, padding: "52px 70px 48px" }}>
      <svg width={120} height={120} viewBox="18 92 130 130" style={{ display: "block", flexShrink: 0 }}>
        <image href="/gsrtc-logo.jpg" width={553} height={391} />
        <rect x="18" y="92" width="26" height="130" fill="white" />
      </svg>
      <div style={{ marginTop: 16, fontSize: 34, fontWeight: "bold", textAlign: "center", letterSpacing: "0.5px", lineHeight: 1.2 }}>
        Draft Tender Paper
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: "bold", textAlign: "center", letterSpacing: "2px" }}>
        (D.T.P.)
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", width: "100%", gap: 2 }}>
        {now ? (
          now.split("\n").map((line, i) => (
            <div key={i} style={{ fontSize: 20, fontWeight: "bold", lineHeight: 1.75 }}>{line || " "}</div>
          ))
        ) : (
          <div style={{ fontSize: 18, color: "#bbb", fontStyle: "italic" }}>Name of Work will appear here…</div>
        )}
        <div style={{ marginTop: 20, fontSize: 18, fontWeight: "bold" }}>
          (BUDGET {budgetNo || "???"}/{yr})
        </div>
      </div>
      <div style={{ width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: "0.3px", marginBottom: 10 }}>
          Gujarat State Road Transport Corporation
        </div>
        <div style={{ borderTop: "2px solid #000", marginBottom: 12 }} />
        <div style={{ fontSize: 12.5, lineHeight: 2 }}>
          First Floor, Civil Engineering Department,<br />
          Central Office, Nr. Bus Port, Ranip,<br />
          Ahmedabad &#8209;382480
        </div>
      </div>
    </div>
  );

  const secProforma = () => {
    const THp: React.CSSProperties = { border: "1px solid #000", padding: "3px 5px", fontWeight: "bold", fontSize: 10.5, textAlign: "center", verticalAlign: "middle" };
    const TDp: React.CSSProperties = { border: "1px solid #000", padding: "3px 5px", fontSize: 10, verticalAlign: "top" };
    return (
      <div style={PAGE}>
        <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>
          Name of Work :- {now || "—"}
        </div>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 2 }}>
          PROFORMA  -  I
        </div>
        <div style={{ textAlign: "center", fontSize: 10.5, marginBottom: 10 }}>
          [To accompany with submission of S.B.D.]
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "4%" }} /><col style={{ width: "5%" }} />
            <col style={{ width: "63%" }} /><col style={{ width: "4%" }} /><col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={THp}>Sr.<br />No.</th><th style={THp}>No.</th>
              <th style={THp}>Particulars</th><th style={THp}></th>
              <th style={THp}>Remarks / Reply</th>
            </tr>
          </thead>
          <tbody>
            {PROFORMA_SECTIONS.map((sec) => (
              <React.Fragment key={sec.no}>
                <tr>
                  <td style={{ ...TDp, fontWeight: "bold", textAlign: "center", verticalAlign: "middle" }}>{sec.no}</td>
                  <td colSpan={4} style={{ ...TDp, fontWeight: "bold" }}>{sec.title}</td>
                </tr>
                {sec.items.map((item) => (
                  <tr key={item.n}>
                    <td style={{ ...TDp, textAlign: "center" }}></td>
                    <td style={{ ...TDp, textAlign: "center", whiteSpace: "nowrap" }}>{item.n}</td>
                    <td style={{ ...TDp, lineHeight: 1.35 }}>{item.q}</td>
                    <td style={{ ...TDp, textAlign: "center", fontWeight: "bold" }}>::-</td>
                    <td style={{ ...TDp, lineHeight: 1.35 }}>{item.a}</td>
                  </tr>
                ))}
                {"footerNote" in sec && sec.footerNote && (
                  <tr>
                    <td colSpan={5} style={{ ...TDp, fontStyle: "italic", textAlign: "center", padding: "5px 8px" }}>
                      {sec.footerNote}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 14, textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: 1 }}>
          -::&nbsp;&nbsp;CERTIFICATE&nbsp;&nbsp;::-
        </div>
        <div style={{ marginTop: 8, fontSize: 10.5, lineHeight: 1.6, textAlign: "justify" }}>
          {PROFORMA_CERTIFICATE}
        </div>
        <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontSize: 10.5, fontFamily: FONT }}>
          {[
            ["Dy.Engg.(Tech.)", "GSRTC, C.O., A'bad"],
            ["Executive Engineer", "GSRTC, C.O., A'bad"],
            ["Chief Civil Engineer", "GSRTC, C.O., A'bad"],
          ].map(([role, office]) => (
            <div key={role} style={{ textAlign: "center", minWidth: 160 }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4 }}>
                <div style={{ fontWeight: "bold" }}>{role}</div>
                <div>{office}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const secChecklist = () => {
    const THc: React.CSSProperties = { border: "1px solid #000", padding: "3px 5px", fontWeight: "bold", fontSize: 10, textAlign: "center", verticalAlign: "middle", background: "#f9f9f9" };
    const TDck: React.CSSProperties = { border: "1px solid #000", padding: "3px 5px", fontSize: 9.5, verticalAlign: "middle" };
    const TDcc: React.CSSProperties = { ...TDck, textAlign: "center" };
    return (
      <div style={PAGE}>
        <div style={{ fontFamily: FONT }}>
          {/* Name of Work */}
          <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>
            Name of Work :-{" "}{now || <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#aaa" }}>Name of Work will appear here…</span>}
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>CHECK LIST FOR DTP</div>

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "7%" }} /><col style={{ width: "46%" }} />
              <col style={{ width: "17%" }} /><col style={{ width: "8%" }} /><col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={THc}>Sr. No.</th><th style={THc}>Description</th>
                <th style={THc}>Clause No.</th><th style={THc}>Page No.</th><th style={THc}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={TDcc}>1</td><td style={TDck}>Technical Approval Amount</td><td style={TDcc}>-</td><td style={TDcc}>-</td><td style={TDcc}>{derived ? fmtN(derived.A) : "—"}</td></tr>
              <tr><td style={TDcc}>2</td><td style={TDck}>SOR Year</td><td style={TDcc}>-</td><td style={TDcc}>-</td><td style={TDcc}>{yr}</td></tr>
              <tr><td style={TDcc}>3</td><td style={TDck}>DTP amount</td><td style={TDcc}>IFB</td><td style={TDcc}>4</td><td style={TDcc}>{derived ? fmtN(derived.A) : "—"}</td></tr>
              <tr><td style={TDcc}>4</td><td style={TDck}>Tender Fee Rs.</td><td style={TDcc}>-</td><td style={TDcc}>-</td><td style={TDcc}>{tenderFee}</td></tr>
              <tr><td style={TDcc}>5</td><td style={TDck}>Earnest Money Deposit Rs.</td><td style={TDcc}>IFB Point 6</td><td style={TDcc}>4</td><td style={TDcc}>{fmtN(emd, 2)}</td></tr>
              <tr><td style={TDcc}>6</td><td style={TDck}>Time Limit (Months)</td><td style={TDcc}>Section 3 cl. 17</td><td style={TDcc}>41</td><td style={TDcc}>{timeLimit}</td></tr>
              <tr><td style={TDcc}>7</td><td style={TDck}>Annual Financial Turnover Amount Rs.</td><td style={TDcc}>Section 1 Cl. 4.5.3.(a)</td><td style={TDcc}>9</td><td style={TDcc}>As Mentioned in SBD</td></tr>
              <tr><td style={TDcc}>8</td><td style={TDck}>Defect Liability Period</td><td style={TDcc}>Section 3 cl. 33.1</td><td style={TDcc}>46</td><td style={TDcc}>As Mentioned in SBD</td></tr>
              <tr><td style={TDcc}>9</td><td style={TDck}>Free Maintenance Guarantee Period</td><td style={TDcc}>Section 3 cl. 33.2</td><td style={TDcc}>46</td><td style={TDcc}>As Mentioned in SBD</td></tr>
              <tr><td style={TDcc}>10</td><td style={TDck}>Registration / Category required</td><td style={TDcc}>-</td><td style={TDcc}>-</td><td style={TDcc}>B &amp; Above</td></tr>
              <tr><td style={TDcc}>11</td><td style={TDck}>Site Possession Date</td><td style={TDcc}>Section 3 cl. 21</td><td style={TDcc}>42</td><td style={TDcc}>1<sup>st</sup> day of Work Order</td></tr>
              <tr><td style={TDcc}>12</td><td style={TDck}>Period between Program Update (Days)</td><td style={TDcc}>Section 3 cl. 27.3</td><td style={TDcc}>44</td><td style={TDcc}>30 days</td></tr>
              <tr><td style={TDcc}>13</td><td style={TDck}>Amount to be withheld for late submission of Program</td><td style={TDcc}>Section 3 cl. 27.3</td><td style={TDcc}>44</td><td style={TDcc}>1 Lakh</td></tr>

              {/* 14 — Milestones */}
              <tr>
                <td style={TDcc}>14</td><td style={TDck}>Milestone:-</td>
                <td style={TDcc}>Section 3 cl. 49.1</td><td style={TDcc}>53</td>
                <td style={{ ...TDck, padding: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ ...TDcc, border: "none", borderBottom: "1px solid #000", width: "50%", fontWeight: "bold", fontSize: 9 }}>%</td>
                        <td style={{ ...TDcc, border: "none", borderBottom: "1px solid #000", fontWeight: "bold", fontSize: 9 }}>Days</td>
                      </tr>
                      {MILESTONES.map((m) => (
                        <tr key={m.sub}>
                          <td style={{ ...TDcc, border: "none", borderBottom: "1px solid #ccc", fontSize: 9 }}>{m.pct}</td>
                          <td style={{ ...TDcc, border: "none", borderBottom: "1px solid #ccc", fontSize: 9 }}>{m.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
              {MILESTONES.map((m) => (
                <tr key={m.sub}>
                  <td style={TDcc}>{m.sub}</td><td style={TDck}>{m.label}</td>
                  <td style={TDcc}>-</td><td style={TDcc}>-</td>
                  <td style={{ ...TDck, padding: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ ...TDcc, border: "none", width: "50%", fontSize: 9 }}>{m.pct}</td>
                          <td style={{ ...TDcc, border: "none", fontSize: 9 }}>{m.days}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
              <tr><td colSpan={5} style={{ ...TDck, fontStyle: "italic", fontSize: 8.5 }}>#In case of LA/FRA is in progress give likely date.</td></tr>

              {/* 15 — Price Adjustment */}
              <tr><td style={TDcc}>15</td><td style={TDck}>Price Adjustment Components</td><td style={TDcc}>Section 4 cl. 24</td><td style={TDcc}>66</td><td style={TDcc}>%</td></tr>
              {PRICE_ADJ.map((pa) => (
                <tr key={pa.sub}>
                  <td style={TDcc}>{pa.sub}</td><td style={TDck}>{pa.label}</td>
                  <td style={TDcc}>{pa.clause}</td><td style={TDcc}>{pa.page}</td>
                  <td style={TDcc}>{pa.prefix} {pa.val}</td>
                </tr>
              ))}
              <tr><td style={TDcc}></td><td style={{ ...TDck, fontWeight: "bold" }}>Total:-</td><td style={TDcc}>-</td><td style={TDcc}>-</td><td style={TDcc}>100%</td></tr>

              {/* 16 */}
              <tr><td style={TDcc}>16</td><td style={TDck}>Percentage Rate Contract (upto INR 50 Cr.)</td><td style={TDcc}>Section 7</td><td style={TDcc}>78</td><td style={TDcc}>Percentage Rate Contract</td></tr>
              <tr><td colSpan={5} style={{ ...TDck, fontStyle: "italic", fontSize: 8 }}>*Input index/price for each component on 28 days preceding the date of opening of technical bid shall be noted.</td></tr>
            </tbody>
          </table>

          {/* Certificate */}
          <div style={{ marginTop: 12, textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: 1 }}>CERTIFICATE</div>
          <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6, textAlign: "justify" }}>
            This is to certify that the contract document prepared for the work{" "}
            <strong>Name of Work :- {now || "___"}</strong>{" "}
            is based on the standard bidding procurement of civil works published by R&amp;B department Letter No. RBD/0346/10/2023 Dated 12/10/2023.
          </div>
          <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6 }}>No further modification and alteration in this standard format has been made by this office.</div>
          <SigRow />
        </div>
      </div>
    );
  };

  const secSummary = () => {
    const items = allBoqs.map((b, i) => ({ srNo: i + 1, desc: b.subWork === "Civil" ? "Civil Work" : (b.name || b.subWork), amt: parseN(b.totalAmount ?? 0) }));
    const gt = items.reduce((s, i) => s + i.amt, 0);
    const TDs: React.CSSProperties  = { border: "1px solid #000", padding: "4px 7px", fontSize: 10.5, verticalAlign: "middle" };
    const TDcs: React.CSSProperties = { ...TDs, textAlign: "center" };
    const TDrs: React.CSSProperties = { ...TDs, textAlign: "right" };
    return (
      <div style={PAGE}>
        <div style={{ fontFamily: FONT }}>
          {/* Name of Work */}
          <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>
            Name of Work :-{" "}{now || <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#aaa" }}>Name of Work will appear here…</span>}
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 14, letterSpacing: 2, marginBottom: 10 }}>SUMMARY</div>

          <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "10%" }} /><col style={{ width: "60%" }} /><col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...TDcs, fontWeight: "bold", background: "#f9f9f9" }}>No.</th>
                <th style={{ ...TDs,  fontWeight: "bold", background: "#f9f9f9" }}>Description</th>
                <th style={{ ...TDrs, fontWeight: "bold", background: "#f9f9f9" }}>Tender Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.srNo}>
                  <td style={TDcs}>{row.srNo}</td>
                  <td style={TDs}>{row.desc}</td>
                  <td style={TDrs}>{fmtN(row.amt)}</td>
                </tr>
              ))}
              <tr><td colSpan={2} style={{ ...TDs, fontWeight: "bold", textAlign: "right" }}>TOTAL Rs. :-</td><td style={{ ...TDrs, fontWeight: "bold" }}>{fmtN(gt)}</td></tr>
              <tr><td colSpan={2} style={{ ...TDs, fontWeight: "bold", textAlign: "right" }}>SAY Rs. :-</td><td style={{ ...TDrs, fontWeight: "bold" }}>{fmtN(Math.round(gt), 0)}</td></tr>
            </tbody>
          </table>

          {/* Notes */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: "bold", fontSize: 10.5, marginBottom: 4 }}>Note :-</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {SUMMARY_NOTES.map((note, i) => (
                  <tr key={i}>
                    <td style={{ ...TDcs, width: "5%", verticalAlign: "top", fontSize: 10 }}>[{i + 1}]</td>
                    <td style={{ ...TDs, fontSize: 10, lineHeight: 1.45 }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SigRow />
        </div>
      </div>
    );
  };

  const secTenderCivil = () => {
    const THt: React.CSSProperties = { border: "1px solid #000", padding: "3px 4px", fontWeight: "bold", fontSize: 9, textAlign: "center", verticalAlign: "middle", background: "#f5f5f5" };
    const TDt: React.CSSProperties = { border: "1px solid #000", padding: "2px 4px", fontSize: 8.5, verticalAlign: "top" };
    const TDct: React.CSSProperties = { ...TDt, textAlign: "center", verticalAlign: "middle" };
    const TDrt: React.CSSProperties = { ...TDt, textAlign: "right", verticalAlign: "middle" };
    const totalAmt = boqItems.reduce((s, i) => s + parseN(i.quantity) * parseN(i.rate ?? 0), 0);
    const welfareCess  = totalAmt * 0.01;
    const tenderAmount = totalAmt + welfareCess;
    return (
      <div style={{ ...PAGE, width: 1050 }}>
        <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5, textAlign: "center" }}>
          Name of Work :-{" "}{now || <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#aaa" }}>Name of Work will appear here…</span>}
        </div>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>
          Bill Of Quantities
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "5.5%" }} /><col style={{ width: "7.5%" }} /><col style={{ width: "38%" }} />
            <col style={{ width: "7%" }} /><col style={{ width: "5%" }} />
            <col style={{ width: "7%" }} /><col style={{ width: "21%" }} /><col style={{ width: "9%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={THt}>Item<br />No.</th>
              <th style={THt}>Item<br />Code</th>
              <th style={THt}>Description Of Items</th>
              <th style={THt}>Quantities<br />Estimated<br />but May be<br />Much or Less</th>
              <th style={THt}>Unit</th>
              <th style={THt}>Tender<br />Rate (Rs.)</th>
              <th style={THt}>Rate<br />(In Words)</th>
              <th style={THt}>Total Amount According to<br />Estimated Quantities (In Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {boqItems.map((item, idx) => {
              const qty = parseN(item.quantity), rate = parseN(item.rate ?? 0), amt = qty * rate;
              return (
                <tr key={item.id}>
                  <td style={TDct}>{idx + 1}</td>
                  <td style={TDct}>{getCode(item) || "-"}</td>
                  <td style={{ ...TDt, lineHeight: 1.3 }}>{item.description}</td>
                  <td style={TDrt}>{fmtN(qty, 3)}</td>
                  <td style={TDct}>{item.unit}</td>
                  <td style={TDrt}>{fmtN(rate)}</td>
                  <td style={{ ...TDt, lineHeight: 1.3 }}>{toRupeesWords(rate)}</td>
                  <td style={TDrt}>{fmtN(amt)}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={7} style={{ ...TDrt, fontWeight: "bold", fontSize: 9 }}>Total Amount Rs.</td>
              <td style={{ ...TDrt, fontWeight: "bold" }}>{fmtN(totalAmt)}</td>
            </tr>
            <tr>
              <td colSpan={7} style={{ ...TDrt, fontWeight: "bold", fontSize: 9 }}>1 % Welfare Cess</td>
              <td style={{ ...TDrt, fontWeight: "bold" }}>{fmtN(welfareCess)}</td>
            </tr>
            <tr>
              <td colSpan={7} style={{ ...TDrt, fontWeight: "bold", fontSize: 9 }}>Tender Amount Rs.</td>
              <td style={{ ...TDrt, fontWeight: "bold" }}>{fmtN(tenderAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // CEMENT CONSUMPTION STATEMENT
  const secCementConsumption = () => {
    const cItems = (base?.nonSteelItems ?? []).filter((i) => parseN(i.sorItem?.cementConsumption ?? 0) > 0);
    const totalCementKg = cItems.reduce((s, i) => s + parseN(i.quantity) * parseN(i.sorItem?.cementConsumption ?? 0), 0);
    const cementSay = Math.round(totalCementKg / 1000) * 1000;
    return (
      <div style={PAGE}>
        <SecHeader now={now} />
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, textDecoration: "underline", marginBottom: 8 }}>
          CEMENT CONSUMPTION STATEMENT
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <colgroup>
            <col style={{ width: "5%" }} /><col style={{ width: "9%" }} /><col style={{ width: "36%" }} />
            <col style={{ width: "8%" }} /><col style={{ width: "6%" }} />
            <col style={{ width: "12%" }} /><col style={{ width: "8%" }} /><col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Sr. No.</th>
              <th style={TH}>It. No.</th>
              <th style={TH}>Description of Item</th>
              <th style={{ ...TH, textAlign: "right" }}>Qty.</th>
              <th style={TH}>Unit</th>
              <th style={{ ...TH, textAlign: "right" }}>Rate of Consumption.</th>
              <th style={TH}>Per</th>
              <th style={{ ...TH, textAlign: "right" }}>Total Consumption in Kg.</th>
            </tr>
          </thead>
          <tbody>
            {cItems.length === 0 ? (
              <tr><td colSpan={8} style={{ ...TDc, padding: "12px", color: "#888" }}>No cement consumption data.</td></tr>
            ) : (
              cItems.map((item, idx) => {
                const qty = parseN(item.quantity);
                const cc  = parseN(item.sorItem?.cementConsumption ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={TDc}>{idx + 1}</td>
                    <td style={TDc}>{getCode(item)}</td>
                    <td style={TD}>{item.description}</td>
                    <td style={TDr}>{fmtN(qty, 3)}</td>
                    <td style={TDc}>{item.unit}</td>
                    <td style={TDr}>{fmtN(cc, 3)}</td>
                    <td style={TDc}>{item.unit}</td>
                    <td style={TDr}>{fmtN(qty * cc, 2)}</td>
                  </tr>
                );
              })
            )}
            <tr>
              <td colSpan={7} style={{ ...TDB, textAlign: "right" }}>Total cement in Kg. :-</td>
              <td style={TDBr}>{fmtN(totalCementKg, 2)}</td>
            </tr>
            <tr>
              <td colSpan={7} style={{ ...TDB, textAlign: "right" }}>Say :-</td>
              <td style={TDBr}>{fmtN(cementSay, 2)}</td>
            </tr>
            <tr>
              <td colSpan={7} style={{ ...TDB, textAlign: "right" }}>IN MT :-</td>
              <td style={TDBr}>{fmtN(cementSay / 1000, 2)}</td>
            </tr>
          </tbody>
        </table>
        <SigRow />
      </div>
    );
  };

  // STEEL CONSUMPTION (REQUIREMENT OF STEEL)
  const secSteelConsumption = () => {
    const sItems = base?.steelItems ?? [];
    const totalSteelKg = base?.totalSteelKg ?? 0;
    return (
      <div style={PAGE}>
        <SecHeader now={now} />
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, textDecoration: "underline", marginBottom: 4 }}>
          REQUIREMENT OF STEEL
        </div>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 9, marginBottom: 8 }}>
          T.M.T. Fe-500/500D (Steel Bar)
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <colgroup>
            <col style={{ width: "6%" }} /><col style={{ width: "10%" }} /><col style={{ width: "46%" }} />
            <col style={{ width: "12%" }} /><col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} /><col style={{ width: "6%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Sr. No.</th>
              <th style={TH}>GSRTC<br />Code</th>
              <th style={TH}>Description of Item</th>
              <th style={{ ...TH, textAlign: "right" }}>Qty.</th>
              <th style={TH}>Unit</th>
              <th style={{ ...TH, textAlign: "right" }}>Qty.<br />(In M.T.)</th>
              <th style={TH}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {sItems.length === 0 ? (
              <tr><td colSpan={7} style={{ ...TDc, color: "#888", padding: "8px" }}>No steel items in this BOQ.</td></tr>
            ) : (
              sItems.map((item, idx) => {
                const qtyKg = parseN(item.quantity);
                return (
                  <tr key={item.id}>
                    <td style={TDc}>{idx + 1}</td>
                    <td style={TDc}>{getCode(item)}</td>
                    <td style={TD}>{item.description}</td>
                    <td style={TDr}>{fmtN(qtyKg, 3)}</td>
                    <td style={TDc}>{item.unit}</td>
                    <td style={TDr}>{fmtN(qtyKg / 1000, 3)}</td>
                    <td style={TDc}>M.T.</td>
                  </tr>
                );
              })
            )}
            <tr>
              <td colSpan={5} style={{ ...TDB, textAlign: "right" }}>Total Steel in MT :-</td>
              <td colSpan={2} style={TDBr}>{fmtN(totalSteelKg / 1000, 3)}</td>
            </tr>
          </tbody>
        </table>
        <SigRow />
      </div>
    );
  };

  const secCostOfMaterial = () => {
    if (!derived) return null;
    const { cementMT, steelMT, cementCost, steelCost, sandCost, aggCost, B, C } = derived;
    const sandCMT = base?.totalSandCMT ?? 0, aggCMT = base?.totalAggCMT ?? 0;
    const matItems = base?.materialItems ?? [];

    const secARows: { label: string; qty: number; unit: string; rate: string; cost: number }[] = [];
    if (cementMT > 0) secARows.push({ label: "Cement",    qty: cementMT, unit: "M.T.", rate: cR, cost: cementCost });
    if (steelMT  > 0) secARows.push({ label: "TMT Steel", qty: steelMT,  unit: "M.T.", rate: sR, cost: steelCost  });

    const secBRows: { code: string; label: string; qty: number; unit: string; rate: string; cost: number }[] = [];
    if (sandCMT > 0) secBRows.push({ code: "M158", label: "Sand",              qty: sandCMT, unit: "CMT", rate: saR, cost: sandCost });
    if (aggCMT  > 0) secBRows.push({ code: "M176", label: "Kapchi / Aggregate",qty: aggCMT,  unit: "CMT", rate: agR, cost: aggCost  });

    const tblCols = (
      <colgroup>
        <col style={{ width: "5%" }} /><col style={{ width: "9%" }} /><col style={{ width: "35%" }} />
        <col style={{ width: "9%" }} /><col style={{ width: "6%" }} />
        <col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "16%" }} />
      </colgroup>
    );
    const tblHead = (
      <thead>
        <tr>
          <th style={TH}>Sr.</th><th style={TH}>Tender Item No.</th><th style={TH}>Details of Material</th>
          <th style={{ ...TH, textAlign: "right" }}>Qty.</th><th style={TH}>Unit</th>
          <th style={{ ...TH, textAlign: "right" }}>Input Rate</th>
          <th style={TH}>Per</th>
          <th style={{ ...TH, textAlign: "right" }}>Amount (Rs.)</th>
        </tr>
      </thead>
    );
    let bsr = 1;
    return (
      <div style={PAGE}>
        <SecHeader now={now} />
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, textDecoration: "underline", marginBottom: 8 }}>COST OF MATERIAL</div>

        {/* Section A */}
        <div style={{ fontWeight: "bold", fontSize: 8.5, background: "#FFF5E6", border: "1px solid #DDB870", padding: "3px 6px", marginBottom: 4 }}>
          A :- Cost Of Steel, Cement &amp; Asphalt
        </div>
        {secARows.length === 0 ? (
          <div style={{ fontSize: 8.5, color: "#888", padding: "6px 0", marginBottom: 10 }}>No cement or steel data — re-import SOR to populate.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 10 }}>
            {tblCols}{tblHead}
            <tbody>
              {secARows.map((r, idx) => (
                <tr key={r.label}>
                  <td style={TDc}>{idx + 1}</td><td style={TDc}></td><td style={TD}>{r.label}</td>
                  <td style={TDr}>{fmtN(r.qty, 3)}</td><td style={TDc}>{r.unit}</td>
                  <td style={TDr}>{r.rate || "-"}</td><td style={TDc}>Per M.T.</td>
                  <td style={TDr}>{fmtN(r.cost)}</td>
                </tr>
              ))}
              <tr><td colSpan={7} style={{ ...TDB, textAlign: "right" }}>Total Rs. :-</td><td style={TDBr}>{fmtN(B)}</td></tr>
              <tr><td colSpan={7} style={{ ...TDB, textAlign: "right" }}>Say Rs. :-</td><td style={TDBr}>{fmtN(Math.round(B), 0)}</td></tr>
            </tbody>
          </table>
        )}

        {/* Section B */}
        <div style={{ fontWeight: "bold", fontSize: 8.5, background: "#FFF5E6", border: "1px solid #DDB870", padding: "3px 6px", marginBottom: 4 }}>
          B :- Material Other than Steel, Cement &amp; Asphalt
        </div>
        {secBRows.length === 0 && matItems.length === 0 ? (
          <div style={{ fontSize: 8.5, color: "#888", padding: "6px 0" }}>No quarry material data — re-import SOR to populate sand/aggregate ratios.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            {tblCols}{tblHead}
            <tbody>
              {secBRows.map((r) => (
                <tr key={r.code}>
                  <td style={TDc}>{bsr++}</td><td style={TDc}>{r.code}</td><td style={TD}>{r.label}</td>
                  <td style={TDr}>{fmtN(r.qty, 3)}</td><td style={TDc}>{r.unit}</td>
                  <td style={TDr}>{r.rate || "-"}</td><td style={TDc}>Per CMT</td>
                  <td style={TDr}>{fmtN(r.cost)}</td>
                </tr>
              ))}
              {matItems.map((item) => {
                const qty = parseN(item.quantity), rate = parseN(item.rate ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={TDc}>{bsr++}</td><td style={TDc}>{getCode(item)}</td>
                    <td style={TD}>{item.sorItem?.materialDescription || item.description}</td>
                    <td style={TDr}>{fmtN(qty, 3)}</td><td style={TDc}>{item.unit}</td>
                    <td style={TDr}>{fmtN(rate)}</td><td style={TDc}>Per {item.unit}</td>
                    <td style={TDr}>{fmtN(qty * rate)}</td>
                  </tr>
                );
              })}
              <tr><td colSpan={7} style={{ ...TDB, textAlign: "right" }}>Total Rs. :-</td><td style={TDBr}>{fmtN(C)}</td></tr>
              <tr><td colSpan={7} style={{ ...TDB, textAlign: "right" }}>Say Rs. :-</td><td style={TDBr}>{fmtN(Math.round(C), 0)}</td></tr>
            </tbody>
          </table>
        )}
        <div style={{ ...TDB, textAlign: "right", border: "1px solid #000", padding: "3px 6px", marginTop: 6, fontSize: 9 }}>
          Total Cost Of Material :- Rs.&nbsp;<strong>{derived ? fmtN(B + C) : "—"}</strong>
        </div>
        <SigRow />
      </div>
    );
  };

  const secStatement1 = () => {
    const items = boqItems.filter((i) => parseN(i.sorItem?.sandRatio ?? 0) > 0 || parseN(i.sorItem?.aggregateRatio ?? 0) > 0);
    const totalSand = items.reduce((s, i) => s + parseN(i.quantity) * parseN(i.sorItem?.sandRatio ?? 0), 0);
    const totalAgg  = items.reduce((s, i) => s + parseN(i.quantity) * parseN(i.sorItem?.aggregateRatio ?? 0), 0);
    return (
      <div style={PAGE}>
        <SecHeader now={now} />
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, textDecoration: "underline", marginBottom: 2 }}>STATEMENT [1]</div>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 9.5, marginBottom: 8 }}>STATEMENT OF ITEMWISE Quarry Materials</div>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", fontSize: 9, color: "#888", border: "1px dashed #ccc", borderRadius: 4 }}>
            No items with sand / aggregate ratio data found. Please re-import SOR data for this division.
          </div>
        ) : (
          <React.Fragment>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <colgroup>
              <col style={{ width: "5%" }} /><col style={{ width: "9%" }} /><col style={{ width: "32%" }} />
              <col style={{ width: "7%" }} /><col style={{ width: "6%" }} />
              <col style={{ width: "8%" }} /><col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} /><col style={{ width: "10%" }} />
              <col style={{ width: "5%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH} rowSpan={2}>Item<br/>No.</th><th style={TH} rowSpan={2}>Item<br/>Code</th>
                <th style={TH} rowSpan={2}>Description of Item</th>
                <th style={TH} rowSpan={2}>Qty</th><th style={TH} rowSpan={2}>Per</th>
                <th style={{ ...TH, background: "#e8f4fd" }} colSpan={2}>Sand</th>
                <th style={{ ...TH, background: "#fef9e8" }} colSpan={2}>Kapchi / Aggregate</th>
                <th style={TH} rowSpan={2}></th>
              </tr>
              <tr>
                <th style={{ ...TH, background: "#e8f4fd" }}>Std.<br/>Ratio</th>
                <th style={{ ...TH, background: "#e8f4fd" }}>Total</th>
                <th style={{ ...TH, background: "#fef9e8" }}>Std.<br/>Ratio</th>
                <th style={{ ...TH, background: "#fef9e8" }}>Total</th>
                <th style={TH}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty = parseN(item.quantity);
                const sRat = parseN(item.sorItem?.sandRatio ?? 0);
                const aRat = parseN(item.sorItem?.aggregateRatio ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={TDc}>{idx + 1}</td><td style={TDc}>{getCode(item)}</td>
                    <td style={TD}>{item.description}</td>
                    <td style={TDr}>{fmtN(qty, 3)}</td><td style={TDc}>{item.unit}</td>
                    <td style={{ ...TDr, background: "#f0f9ff" }}>{sRat > 0 ? fmtN(sRat, 4) : "-"}</td>
                    <td style={{ ...TDr, background: "#f0f9ff" }}>{sRat > 0 ? fmtN(qty * sRat, 3) : "-"}</td>
                    <td style={{ ...TDr, background: "#fffbeb" }}>{aRat > 0 ? fmtN(aRat, 4) : "-"}</td>
                    <td style={{ ...TDr, background: "#fffbeb" }}>{aRat > 0 ? fmtN(qty * aRat, 3) : "-"}</td>
                    <td style={TDc}></td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={5} style={{ ...TDB, textAlign: "right" }}>Total Qty. :-</td>
                <td style={{ ...TDBr, background: "#e0f2fe" }}></td>
                <td style={{ ...TDBr, background: "#e0f2fe" }}>{fmtN(totalSand, 3)}</td>
                <td style={{ ...TDBr, background: "#fef3c7" }}></td>
                <td style={{ ...TDBr, background: "#fef3c7" }}>{fmtN(totalAgg, 3)}</td>
                <td style={TDc}></td>
              </tr>
              <tr>
                <td colSpan={5} style={{ ...TDB, textAlign: "right" }}>Unit Per :-</td>
                <td style={{ ...TDc, fontWeight: "bold", background: "#e0f2fe" }}></td>
                <td style={{ ...TDc, fontWeight: "bold", background: "#e0f2fe" }}>CMT</td>
                <td style={{ ...TDc, fontWeight: "bold", background: "#fef3c7" }}></td>
                <td style={{ ...TDc, fontWeight: "bold", background: "#fef3c7" }}>CMT</td>
                <td style={TDc}></td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 8, marginTop: 10, color: "#555" }}>
            Note: Sand and Aggregate quantities derived from BOQ quantities multiplied by SOR standard ratios.
          </div>
          </React.Fragment>
        )}
        <SigRow />
      </div>
    );
  };

  const secPOL = () => {
    if (!derived) return null;
    const { polAItems, polBItems } = derived;
    const kmFn = (qty: number, per: number, l: number) => per > 0 ? (qty / per) * l : 0;
    const trFn = (qty: number, per: number) => per > 0 ? qty / per : 0;

    const polRate = parseN(dieselRate) || 1;
    const aItems = polAItems.filter((r) => r.qty > 0);
    const bItems = polBItems.filter((r) => r.qty > 0);
    const totalKmA = aItems.reduce((s, r) => s + kmFn(r.qty, r.qpt, r.lead), 0);
    const totalKmB = bItems.reduce((s, r) => s + kmFn(r.qty, r.qpt, r.lead), 0);
    const totalKm  = totalKmA + totalKmB;
    const totalRs  = totalKm * polRate;

    const colGroup = (
      <colgroup>
        <col style={{ width: "5%" }} /><col style={{ width: "8%" }} /><col style={{ width: "30%" }} />
        <col style={{ width: "8%" }} /><col style={{ width: "6%" }} />
        <col style={{ width: "7%" }} /><col style={{ width: "8%" }} />
        <col style={{ width: "7%" }} /><col style={{ width: "10%" }} />
        <col style={{ width: "5%" }} />
      </colgroup>
    );
    const thead = (
      <thead>
        <tr>
          <th style={TH}>Sr.<br/>No.</th><th style={TH}>Item<br/>Code</th>
          <th style={TH}>Details of Material</th>
          <th style={{ ...TH, textAlign: "right" }}>Qty</th><th style={TH}>Per</th>
          <th style={TH}>Qty.Per<br/>(Load)</th><th style={TH}>No.Of<br/>Trip</th>
          <th style={TH}>Avg.Lead<br/>(km)</th><th style={TH}>Total K.M.</th>
          <th style={TH}></th>
        </tr>
      </thead>
    );
    const idToCode: Record<string, string> = { cement: "", steel: "", sand: "M158", agg: "M176" };
    const renderRows = (rows: typeof aItems) => rows.map((r, idx) => (
      <tr key={r.id}>
        <td style={TDc}>{idx + 1}</td>
        <td style={TDc}>{idToCode[r.id] ?? ""}</td>
        <td style={TD}>{r.details}</td>
        <td style={TDr}>{fmtN(r.qty, 3)}</td>
        <td style={TDc}>{r.unit}</td>
        <td style={TDr}>{r.qpt}</td>
        <td style={TDr}>{fmtN(trFn(r.qty, r.qpt), 2)}</td>
        <td style={TDr}>{r.lead}</td>
        <td style={TDr}>{fmtN(kmFn(r.qty, r.qpt, r.lead), 2)}</td>
        <td style={TDc}></td>
      </tr>
    ));

    return (
      <div style={PAGE}>
        <SecHeader now={now} />
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, textDecoration: "underline", marginBottom: 8 }}>
          P.O.L.
        </div>

        {/* Section A */}
        <div style={{ fontWeight: "bold", fontSize: 9, marginBottom: 4, textDecoration: "underline" }}>
          A :- Cost Of Steel, Cement &amp; Asphalt
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
          {colGroup}{thead}
          <tbody>
            {aItems.length === 0 ? (
              <tr><td colSpan={10} style={{ ...TDc, color: "#888", padding: "8px" }}>No cement/steel data.</td></tr>
            ) : renderRows(aItems)}
            <tr>
              <td colSpan={8} style={{ ...TDBr }}>Total K.M. (Section A)</td>
              <td style={TDBr}>{fmtN(totalKmA, 2)}</td>
              <td style={TDc}></td>
            </tr>
          </tbody>
        </table>

        {/* Section B */}
        <div style={{ fontWeight: "bold", fontSize: 9, marginBottom: 4, textDecoration: "underline" }}>
          B :- Material Other than Steel, Cement &amp; Asphalt
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
          {colGroup}{thead}
          <tbody>
            {bItems.length === 0 ? (
              <tr><td colSpan={10} style={{ ...TDc, color: "#888", padding: "8px" }}>No quarry material data.</td></tr>
            ) : renderRows(bItems)}
            <tr>
              <td colSpan={8} style={{ ...TDBr }}>Total K.M. (Section B)</td>
              <td style={TDBr}>{fmtN(totalKmB, 2)}</td>
              <td style={TDc}></td>
            </tr>
          </tbody>
        </table>

        {/* Summary */}
        <table style={{ borderCollapse: "collapse", width: "60%", marginLeft: "auto", marginTop: 4 }}>
          <tbody>
            <tr>
              <td style={{ ...TD, fontWeight: "bold", width: "60%" }}>Total K.M.</td>
              <td style={{ ...TDBr }}>{fmtN(totalKm, 2)}</td>
            </tr>
            <tr>
              <td style={{ ...TD, fontWeight: "bold" }}>POL Rate (Rs./km)</td>
              <td style={{ ...TDBr }}>{fmtN(polRate, 2)}</td>
            </tr>
            <tr>
              <td style={{ ...TD, fontWeight: "bold" }}>Total Rs. :-</td>
              <td style={{ ...TDBr }}>{fmtN(totalRs, 2)}</td>
            </tr>
            <tr>
              <td style={{ ...TD, fontWeight: "bold" }}>Say Rs. :-</td>
              <td style={{ ...TDBr }}>{fmtN(Math.round(totalRs), 0)}</td>
            </tr>
          </tbody>
        </table>
        <SigRow />
      </div>
    );
  };

  const secDetailedSpecs = () => {
    const specItems = boqItems
      .map((item, idx) => ({ item, idx, spec: itemSpecs.get(getCode(item)) }))
      .filter(({ spec }) => spec !== undefined) as { item: BOQItemFull; idx: number; spec: ItemSpec }[];

    if (specItems.length === 0) return null;

    const getSecStyle = (title: string) => {
      if (/workmanship/i.test(title))  return { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" };
      if (/material/i.test(title))     return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
      if (/measurement/i.test(title))  return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
      return                                   { bg: "#e0e7ff", color: "#4f46e5", border: "#c7d2fe" };
    };

    return (
      <div style={PAGE}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: "bold" }}>G.S.R.T.C. Central Office Ranip, Ahmedabad</div>
          <div style={{ fontSize: 10, marginTop: 6, fontWeight: "bold", textDecoration: "underline" }}>
            Detailed Specifications
          </div>
          <div style={{ fontSize: 9, marginTop: 4 }}>
            <strong>Name of Work :-</strong>&nbsp;{now || "—"}
          </div>
        </div>

        {specItems.map(({ item, idx, spec }, i) => (
          <div key={item.id} style={{ marginBottom: 20, ...(i > 0 ? { pageBreakBefore: "always" as const } : {}) }}>
            {/* Item header — matches standalone buildPrintHTML item-header */}
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ width: 100, padding: "8px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", verticalAlign: "top", fontWeight: 600 }}>
                    <div style={{ fontSize: 8, color: "#64748b" }}>Item No: {idx + 1}</div>
                    <div style={{ fontSize: 10.5, fontFamily: "monospace", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {spec.Item_Code}
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderLeft: "none", verticalAlign: "top", fontSize: 8.5, lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: spec.Description || "-" }}
                  />
                </tr>
              </tbody>
            </table>

            {/* Sections */}
            {(spec.sections ?? []).map((sec, si) => {
              const c = getSecStyle(sec.title);
              const isGeneric = !/workmanship|material|measurement/i.test(sec.title);
              type SubSec = { title: string; description: string };
              const subs = (sec.subsections ?? []) as SubSec[];
              const lines: string[] = [];
              if (!isGeneric) {
                if (sec.description) lines.push(sec.description);
                subs.forEach((s) => { if (s.description) lines.push(s.description); });
              }

              return (
                <div key={si}>
                  <div style={{ display: "flex", alignItems: "center", padding: "5px 10px", fontWeight: 700, fontSize: 8.5, background: c.bg, color: c.color, marginTop: 6 }}>
                    {sec.title}
                  </div>
                  {isGeneric ? (
                    <div style={{ border: "1px solid #e0e7ff", borderTop: "none", padding: "6px 10px", fontSize: 8, lineHeight: 1.5 }}>
                      {sec.description && <div dangerouslySetInnerHTML={{ __html: sec.description }} />}
                      {subs.map((s, ssi) => (
                        <div key={ssi} style={{ marginLeft: 12, marginTop: 4 }}>
                          {s.title && <div style={{ fontWeight: 700, fontSize: 7.5, textTransform: "uppercase", color: "#475569", marginBottom: 2 }}>{s.title}</div>}
                          {s.description && <div style={{ color: "#475569", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: s.description }} />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ border: "1px solid #e2e8f0", borderTop: "none" }}>
                      {lines.map((l, li) => (
                        <div key={li} style={{ display: "flex", alignItems: "stretch", borderBottom: li < lines.length - 1 ? "1px solid #e2e8f0" : "none", fontSize: 8.5, lineHeight: 1.5 }}>
                          <div style={{ width: 22, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b", borderRight: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0, fontSize: 8 }}>
                            {li + 1}
                          </div>
                          <div style={{ padding: "5px 8px", flex: 1, textAlign: "justify" }} dangerouslySetInnerHTML={{ __html: l }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <SigRow />
      </div>
    );
  };

  const secMainAbstract = () => {
    if (!derived) return null;
    const { A, B, C, D, E, F, G, cementCost, steelCost, cementMT, steelMT, sandCost, aggCost } = derived;
    const sandCMT = base?.totalSandCMT ?? 0, aggCMT = base?.totalAggCMT ?? 0;
    return (
      <div style={PAGE}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: "bold" }}>G.S.R.T.C. Central Office Ranip, Ahmedabad</div>
          <div style={{ fontSize: 10, marginTop: 6, fontWeight: "bold", textDecoration: "underline" }}>
            Details of Labour, Material &amp; P.O.L. Component
          </div>
          <div style={{ fontSize: 9, marginTop: 6 }}>
            <strong>Name of Work :-</strong>&nbsp;{now || "—"}
          </div>
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <colgroup>
            <col style={{ width: "6%" }} /><col style={{ width: "64%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "20%" }} /><col style={{ width: "6%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...TD, fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>Sr.</th>
              <th style={{ ...TD, fontWeight: "bold", background: "#f5f5f5" }}>Description</th>
              <th style={{ ...TD, fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>Unit</th>
              <th style={{ ...TD, fontWeight: "bold", textAlign: "right", background: "#f5f5f5" }}>Amount (Rs.)</th>
              <th style={{ ...TD, fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>Ref.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...TDc, fontWeight: "bold" }}>[A]</td>
              <td style={TD}>Estimated Amount put to Tender</td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(A, 2)}</td>
              <td style={TDc}>A</td>
            </tr>
            <tr>
              <td style={{ ...TDc, fontWeight: "bold" }}>[B]</td>
              <td style={TD}>
                Cost of Steel, Cement and Asphalt
                <div style={{ fontSize: 7.5, color: "#555", marginTop: 2 }}>
                  Cement: {fmtN(cementMT, 3)} MT × ₹{cR || "0"} = ₹{fmtN(cementCost)}&nbsp;&nbsp;|&nbsp;&nbsp;
                  Steel: {fmtN(steelMT, 3)} MT × ₹{sR || "0"} = ₹{fmtN(steelCost)}
                </div>
              </td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(B, 2)}</td>
              <td style={TDc}>B</td>
            </tr>
            <tr>
              <td style={{ ...TDc, fontWeight: "bold" }}>[C]</td>
              <td style={TD}>
                Cost of Materials Other than Steel, Cement &amp; Asphalt
                <div style={{ fontSize: 7.5, color: "#555", marginTop: 2 }}>
                  Sand: {fmtN(sandCMT, 3)} CMT × ₹{saR || "0"} = ₹{fmtN(sandCost)}&nbsp;&nbsp;|&nbsp;&nbsp;
                  Agg: {fmtN(aggCMT, 3)} CMT × ₹{agR || "0"} = ₹{fmtN(aggCost)}
                </div>
              </td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(C, 2)}</td>
              <td style={TDc}>C</td>
            </tr>
            <tr style={{ background: "#f0f9ff" }}>
              <td style={{ ...TDc, fontWeight: "bold" }}>[D]</td>
              <td style={{ ...TDB }}>Estimated Amount Excluding Steel, Cement &amp; Asphalt = [A] - [B]</td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(D, 2)}</td>
              <td style={TDc}>D</td>
            </tr>
            <tr>
              <td style={{ ...TDc, fontWeight: "bold" }}>[E]</td>
              <td style={TD}>Cost of P.O.L.</td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(E, 2)}</td>
              <td style={TDc}>E</td>
            </tr>
            <tr style={{ background: "#f0f9ff" }}>
              <td style={{ ...TDc, fontWeight: "bold" }}>[F]</td>
              <td style={TDB}>Cost of Labour = [A] - [B] - [C] - [E] = [D] - [C] - [E]</td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(F, 2)}</td>
              <td style={TDc}>F</td>
            </tr>
            <tr>
              <td style={{ ...TDc, fontWeight: "bold" }}>[G]</td>
              <td style={TD}>Cost of Plant &amp; Machinery = {plantPct}% of [F]</td>
              <td style={TDc}>Rs.</td>
              <td style={TDBr}>{fmtN(G, 2)}</td>
              <td style={TDc}>G</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 8, textDecoration: "underline" }}>
          Percentage Breakdown
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <colgroup>
            <col style={{ width: "5%" }} /><col style={{ width: "65%" }} /><col style={{ width: "30%" }} />
          </colgroup>
          <tbody>
            {([
              { sr: "1", label: `Percentage of Labour Component = [F] / [A] × 100`,                   num: F,          den: A },
              { sr: "2", label: `Percentage of Material Component = [C] / [A] × 100`,                 num: C,          den: A },
              { sr: "3", label: `Percentage of P.O.L. Component = [E] / [A] × 100`,                   num: E,          den: A },
              { sr: "4", label: `Percentage of Steel Component = Steel Cost / [A] × 100`,             num: steelCost,  den: A },
              { sr: "5", label: `Percentage of Cement Component = Cement Cost / [A] × 100`,           num: cementCost, den: A },
              { sr: "6", label: `Percentage of Plant & Machinery Component = [G] / [A] × 100`,        num: G,          den: A },
            ]).map(({ sr, label, num, den }) => (
              <tr key={sr}>
                <td style={TDc}>{sr}</td>
                <td style={TD}>{label}</td>
                <td style={{ ...TDr, fontWeight: "bold" }}>{pct(num, den, 3)} %</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: FONT }}>
          {["Prepared by", "Checked by", "Approved by"].map((role) => (
            <div key={role} style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", width: 160, margin: "0 auto 4px" }}></div>
              {role}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PB = ({ label }: { label: string }) => (
    <div className="page-break no-print" style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0", color: "#64748b" }}>
      <div style={{ flex: 1, borderTop: "2px dashed #cbd5e1" }} />
      <span style={{ fontSize: 10, fontWeight: 600, background: "#f1f5f9", padding: "2px 10px", borderRadius: 9999, border: "1px solid #e2e8f0" }}>{label}</span>
      <div style={{ flex: 1, borderTop: "2px dashed #cbd5e1" }} />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── SIDEBAR ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">Generate Full DTP</h1>
            <p className="text-xs text-slate-400">10+ sections · Single print</p>
          </div>
        </div>

            {/* Load BOQ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Load BOQ</p>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Select Project —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNo} — {p.name}</option>)}
                </select>
              </div>
              {boqList.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Civil BOQ</label>
                  <select value={boqId} onChange={(e) => setBoqId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Select BOQ —</option>
                    {boqList.map((b) => <option key={b.id} value={b.id}>{b.boqNo} — {b.name}</option>)}
                  </select>
                </div>
              )}
              <button onClick={loadAll} disabled={!boqId || loading}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Generating…" : "Generate DTP"}
              </button>
            </div>

            {/* DTP Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">DTP Details</p>
              <textarea rows={3} value={now} onChange={(e) => setNow(e.target.value)} placeholder="Name of Work…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Budget No.", v: budgetNo,  set: setBudgetNo,  ph: "e.g. 22" },
                  { label: "Year",       v: yr,        set: setYr,        ph: "2026-27" },
                  { label: "Tender Fee", v: tenderFee, set: setTenderFee, ph: "500" },
                  { label: "Time Limit", v: timeLimit, set: setTimeLimit, ph: "6 Months" },
                ].map(({ label, v, set, ph }) => (
                  <div key={label}>
                    <label className="block text-xs text-slate-500 mb-1">{label}</label>
                    <input type="text" value={v} onChange={(e) => set(e.target.value)} placeholder={ph}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Material Rates */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Material Rates</p>

              {/* Division selector */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">SOR Division</label>
                <select value={division} onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">— Select Division —</option>
                  {["Ahmedabad","Amreli","Bharuch","Bhavnagar","Bhuj","Godhara","Himmatnagar","Jamnagar","Junagadh","Mehsana","Nadiad","Palanpur","Rajkot","Surat","Vadodara","Valsad"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <button onClick={loadMaterialRates} disabled={!division || ratesLoading}
                className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {ratesLoading ? "Loading…" : "Load Rates from SOR"}
              </button>

              <div className="border-t border-slate-100 pt-2 space-y-2">
                {[
                  { label: "Cement (Rs./MT)",     v: cR,     set: setCR  },
                  { label: "Steel (Rs./MT)",      v: sR,     set: setSR  },
                  { label: "Sand (Rs./CMT)",      v: saR,    set: setSaR },
                  { label: "Aggregate (Rs./CMT)", v: agR,    set: setAgR },
                ].map(({ label, v, set }) => (
                  <div key={label}>
                    <label className="block text-xs text-slate-500 mb-1">{label}</label>
                    <input type="number" value={v} onChange={(e) => set(e.target.value)} placeholder="0.00"
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none text-right" />
                  </div>
                ))}
              </div>
            </div>

            {/* POL Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">POL Settings</p>
              {[
                { label: "POL Rate (Rs./km)", v: dieselRate, set: setDieselRate, ph: "1.00" },
                { label: "Avg. Lead (km)",    v: avgLead,    set: setAvgLead,    ph: "25" },
                { label: "Plant % of [F]",    v: plantPct,   set: setPlantPct,   ph: "25" },
              ].map(({ label, v, set, ph }) => (
                <div key={label}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input type="number" value={v} onChange={(e) => set(e.target.value)} placeholder={ph}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none text-right" />
                </div>
              ))}
            </div>

            {/* Quick Summary */}
            {loaded && derived && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5 text-xs">
                <p className="font-semibold text-emerald-700 mb-2">Quick Summary</p>
                {[
                  { l: "BOQ Total [A]",    v: `₹${fmtN(derived.A, 0)}` },
                  { l: "Steel+Cement [B]", v: `₹${fmtN(derived.B, 0)}` },
                  { l: "Materials [C]",    v: `₹${fmtN(derived.C, 0)}` },
                  { l: "POL [E]",          v: `₹${fmtN(derived.E, 0)}` },
                  { l: "Labour [F]",       v: `₹${fmtN(derived.F, 0)}` },
                  { l: "Plant [G]",        v: `₹${fmtN(derived.G, 0)}` },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-emerald-600">{l}</span>
                    <span className="font-bold text-emerald-800">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {loaded && (
              <button onClick={printAll}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors shadow">
                <Printer className="w-4 h-4" />
                Print Full DTP Package
              </button>
            )}
      </div>

      {/* ── RIGHT: ALL SECTIONS ── */}
      <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-4">
        {!loaded ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Select a Project &amp; Civil BOQ, then click &ldquo;Generate DTP&rdquo; to preview all 10 sections.
          </div>
        ) : (
          <div id="dtp-all">
            {secFront()}
            <PB label="Page 2 — Proforma-I" />
            <div className="page-break">{secProforma()}</div>
            <PB label="Page 3 — Check List" />
            <div className="page-break">{secChecklist()}</div>
            <PB label="Page 4 — Summary" />
            <div className="page-break">{secSummary()}</div>
            <PB label="Page 5 — Bill of Quantities (Civil)" />
            <div className="page-break dtp-boq-wide">{secTenderCivil()}</div>
            <PB label="Page 6 — Cement Consumption Statement" />
            <div className="page-break">{secCementConsumption()}</div>
            <PB label="Page 7 — Requirement of Steel" />
            <div className="page-break">{secSteelConsumption()}</div>
            <PB label="Page 8 — Cost of Material" />
            <div className="page-break">{secCostOfMaterial()}</div>
            <PB label="Page 9 — Statement-1 (Quarry Materials)" />
            <div className="page-break">{secStatement1()}</div>
            <PB label="Page 10 — P.O.L." />
            <div className="page-break">{secPOL()}</div>
            <PB label="Page 11 — Main Abstract" />
            <div className="page-break">{secMainAbstract()}</div>
            {itemSpecs.size > 0 && (
              <>
                <PB label="Page 12 — Detailed Specifications" />
                <div className="page-break">{secDetailedSpecs()}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
