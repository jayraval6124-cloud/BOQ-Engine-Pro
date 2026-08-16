"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Plus, X,
  Sparkles, PenTool, Settings2, CheckCircle2,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { DIVISIONS_GUJARAT, SOR_YEARS } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FootingType { id: string; label: string; nos: number; L: number; W: number; D: number; depth: number; }

interface WorkshopInputs {
  L: number; W: number; colSize: number;
  footings: FootingType[];
  gbW: number; gbH: number;
  plinthHt: number; colHt: number;
  pitL_count: number; pitL: number; pitLW: number; pitLH: number;
  pitU_count: number; pitU: number; pitUW: number; pitUH: number;
  windowArea: number; doorArea: number; roofArea: number;
}

// Drawing-level inputs (abstracted from drawing)
interface WorkshopDrawing {
  L: number; W: number;
  bayL: number; bayW: number;   // bay spacing
  colSize: number;
  fCornerL: number; fCornerW: number; fCornerD: number;
  fEdgeLL: number; fEdgeLW: number; fEdgeLD: number;   // edge along long side
  fEdgeSL: number; fEdgeSW: number; fEdgeSD: number;   // edge along short side
  fIntL: number; fIntW: number; fIntD: number;
  foundDepth: number;
  plinthHt: number; colHt: number;
  gbW: number; gbH: number;
  pitL_count: number; pitLLen: number; pitLW: number; pitLH: number;
  pitU_count: number; pitULen: number; pitUW: number; pitUH: number;
  windowArea: number; doorArea: number;
}

interface DMQuarterInputs {
  L: number; W: number; floors: number; colNos: number; colSize: number;
  footingL: number; footingW: number; footingD: number; footingDepth: number;
  wallHtGF: number; wallHtFF: number; windowArea: number; doorArea: number;
}

interface DMDrawing {
  L: number; W: number; floors: number;
  baysX: number; baysY: number; colSize: number;
  footingL: number; footingW: number; footingD: number; footingDepth: number;
  wallHtGF: number; wallHtFF: number; windowArea: number; doorArea: number;
}

interface OHTInputs {
  footingL: number; footingW: number; footingD: number; footingDepth: number;
  colNos: number; colSize: number; floors: number; floorHt: number;
  tankL: number; tankW: number; tankH: number;
}

interface ToiletInputs {
  L: number; W: number;
  footingNos: number; footingL: number; footingW: number; footingD: number; footingDepth: number;
  colNos: number; colSize: number; wallHt: number;
}

interface OilRoomInputs { fuelL: number; fuelW: number; motorL: number; motorW: number; wallHt: number; }
interface CWInputs { runningMeter: number; colSize: number; wallThickness: number; wallHt: number; foundDepth: number; }
interface CCInputs { roadArea: number; roadThick: number; paverArea: number; }
interface SWInputs { mainL: number; branchL: number; drainW: number; drainH: number; drainThick: number; }

interface BOQRow { code: string; description: string; unit: string; qty: number; rate: number; module: string; }

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEF_WS_DRW: WorkshopDrawing = {
  L: 73.25, W: 28.5, bayL: 5.25, bayW: 5.7, colSize: 0.45,
  fCornerL: 2.0, fCornerW: 2.0, fCornerD: 0.45,
  fEdgeLL: 2.65, fEdgeLW: 2.8, fEdgeLD: 0.45,
  fEdgeSL: 2.65, fEdgeSW: 2.9, fEdgeSD: 0.45,
  fIntL: 4.5, fIntW: 4.5, fIntD: 0.45,
  foundDepth: 1.8, plinthHt: 0.6, colHt: 5.5,
  gbW: 0.45, gbH: 0.75,
  pitL_count: 2, pitLLen: 27, pitLW: 2.76, pitLH: 0.6,
  pitU_count: 12, pitULen: 12, pitUW: 2.76, pitUH: 0.6,
  windowArea: 200, doorArea: 80,
};

const DEF_DM_DRW: DMDrawing = {
  L: 10.5, W: 10.5, floors: 2, baysX: 2, baysY: 2, colSize: 0.3,
  footingL: 1.5, footingW: 1.5, footingD: 0.45, footingDepth: 1.5,
  wallHtGF: 3.0, wallHtFF: 3.0, windowArea: 25, doorArea: 15,
};

// Derive WorkshopInputs from WorkshopDrawing
function deriveWorkshop(d: WorkshopDrawing): WorkshopInputs {
  const baysX = Math.max(1, Math.round(d.L / d.bayL));
  const baysY = Math.max(1, Math.round(d.W / d.bayW));
  const colsX = baysX + 1;
  const colsY = baysY + 1;
  const cornerNos = 4;
  const edgeLNos = Math.max(0, (colsX - 2)) * 2;
  const edgeSNos = Math.max(0, (colsY - 2)) * 2;
  const intNos = Math.max(0, (colsX - 2)) * Math.max(0, (colsY - 2));

  const footings: FootingType[] = [
    { id: "f-corner", label: "Corner", nos: cornerNos, L: d.fCornerL, W: d.fCornerW, D: d.fCornerD, depth: d.foundDepth },
    ...(edgeLNos > 0 ? [{ id: "f-edgeL", label: "Edge-L", nos: edgeLNos, L: d.fEdgeLL, W: d.fEdgeLW, D: d.fEdgeLD, depth: d.foundDepth }] : []),
    ...(edgeSNos > 0 ? [{ id: "f-edgeS", label: "Edge-S", nos: edgeSNos, L: d.fEdgeSL, W: d.fEdgeSW, D: d.fEdgeSD, depth: d.foundDepth }] : []),
    ...(intNos > 0 ? [{ id: "f-int", label: "Interior", nos: intNos, L: d.fIntL, W: d.fIntW, D: d.fIntD, depth: d.foundDepth }] : []),
  ];
  return {
    L: d.L, W: d.W, colSize: d.colSize, footings,
    gbW: d.gbW, gbH: d.gbH, plinthHt: d.plinthHt, colHt: d.colHt,
    pitL_count: d.pitL_count, pitL: d.pitLLen, pitLW: d.pitLW, pitLH: d.pitLH,
    pitU_count: d.pitU_count, pitU: d.pitULen, pitUW: d.pitUW, pitUH: d.pitUH,
    windowArea: d.windowArea, doorArea: d.doorArea,
    roofArea: d.L * d.W,
  };
}

// Derive DMQuarterInputs from DMDrawing
function deriveDM(d: DMDrawing): DMQuarterInputs {
  const colNos = (d.baysX + 1) * (d.baysY + 1);
  return {
    L: d.L, W: d.W, floors: d.floors, colNos, colSize: d.colSize,
    footingL: d.footingL, footingW: d.footingW, footingD: d.footingD, footingDepth: d.footingDepth,
    wallHtGF: d.wallHtGF, wallHtFF: d.wallHtFF, windowArea: d.windowArea, doorArea: d.doorArea,
  };
}

// ─── Rates ────────────────────────────────────────────────────────────────────

const RATES: Record<string, number> = {
  exc: 350, fill: 180, pcc148: 4800, pcc136: 5500,
  rccFoot: 8500, rccCol: 9500, rccGB: 8800, rccBeam: 9000, rccSlab: 8800,
  steel: 75000, brick230: 5200, brick115: 4800,
  plas20: 280, plas12: 220, paint: 85, floor: 600,
  peb: 2800, tremix150: 420, tremix200: 520, paver: 850,
  door: 4500, window: 1800, drain: 8500, wpTreatment: 450,
  coping: 250, precastCover: 450, giRoof: 800,
};

const SK = { footing: 60, gb: 150, col: 200, beam: 180, slab: 120 };

// ─── BOQ computations ─────────────────────────────────────────────────────────

function workshopBOQ(i: WorkshopInputs): BOQRow[] {
  const m = "Main Workshop";
  const gbL = 2 * (i.L + i.W);
  const footExc = i.footings.reduce((s, f) => s + f.nos * (f.L + 0.3) * (f.W + 0.3) * f.depth, 0);
  const gbExc = gbL * (i.gbW + 0.3) * (i.gbH + i.plinthHt + 0.3);
  const pitExc = i.pitL_count * i.pitL * i.pitLW * (i.pitLH + 0.3) + i.pitU_count * i.pitU * i.pitUW * (i.pitUH + 0.3);
  const footRCC = i.footings.reduce((s, f) => s + f.nos * f.L * f.W * f.D, 0);
  const gbRCC = gbL * i.gbW * i.gbH;
  const colRCC = i.footings.reduce((s, f) => s + f.nos, 0) * i.colSize * i.colSize * i.colHt;
  const pitRCC = i.pitL_count * 2 * (i.pitL + i.pitLW) * 0.2 * i.pitLH + i.pitU_count * 2 * (i.pitU + i.pitUW) * 0.2 * i.pitUH;
  const wallArea = Math.max(0, 2 * (i.L + i.W) * (i.plinthHt + i.colHt) - i.windowArea - i.doorArea);
  const floorArea = Math.max(0, i.L * i.W - i.pitL_count * i.pitL * i.pitLW - i.pitU_count * i.pitU * i.pitUW);
  const steel = (footRCC * SK.footing + gbRCC * SK.gb + colRCC * SK.col + pitRCC * SK.slab) / 1000;
  return [
    { code: "A-1", description: "Excavation in Foundation, Trenches & Service Pits", unit: "Cum", qty: footExc + gbExc + pitExc, rate: RATES.exc, module: m },
    { code: "A-2", description: "Filling in Foundation with Excavated Earth", unit: "Cum", qty: Math.max(0, (footExc + gbExc) * 0.35), rate: RATES.fill, module: m },
    { code: "B-1", description: "PCC 1:4:8 in Foundation Bed", unit: "Cum", qty: i.footings.reduce((s, f) => s + f.nos * (f.L + 0.1) * (f.W + 0.1) * 0.075, 0) + gbL * (i.gbW + 0.1) * 0.075, rate: RATES.pcc148, module: m },
    { code: "C-1", description: "RCC M-20 in Isolated Footings", unit: "Cum", qty: footRCC, rate: RATES.rccFoot, module: m },
    { code: "C-2", description: "RCC M-20 in Ground Beams (0.45×0.75m)", unit: "Cum", qty: gbRCC, rate: RATES.rccGB, module: m },
    { code: "C-3", description: "RCC M-20 in Columns", unit: "Cum", qty: colRCC, rate: RATES.rccCol, module: m },
    { code: "C-4", description: "RCC M-20 in Service Pits (L-type & U-type)", unit: "Cum", qty: pitRCC, rate: RATES.rccSlab, module: m },
    { code: "D-1", description: "Steel TMT Fe-500 (All RCC Works)", unit: "MT", qty: steel, rate: RATES.steel, module: m },
    { code: "E-1", description: "Brickwork 230mm in Peripheral Walls", unit: "Cum", qty: wallArea * 0.23, rate: RATES.brick230, module: m },
    { code: "F-1", description: "20mm Cement Plaster 1:4 on Walls (Both Sides)", unit: "Sqm", qty: wallArea * 2, rate: RATES.plas20, module: m },
    { code: "G-1", description: "Painting (2 Coats) on Plastered Surface", unit: "Sqm", qty: wallArea * 2, rate: RATES.paint, module: m },
    { code: "H-1", description: "CC Floor / Tremix 150mm (1:2:4) in Workshop", unit: "Sqm", qty: floorArea, rate: RATES.tremix150, module: m },
    { code: "I-1", description: "Pre-Engineered Building Structure & Roofing", unit: "Sqm", qty: i.roofArea, rate: RATES.peb, module: m },
    ...(i.doorArea > 0 ? [{ code: "J-1", description: "Steel Rolling Shutters / Main Gates", unit: "Sqm", qty: i.doorArea, rate: RATES.door, module: m }] : []),
    ...(i.windowArea > 0 ? [{ code: "J-2", description: "Aluminium Windows with Glazing", unit: "Sqm", qty: i.windowArea, rate: RATES.window, module: m }] : []),
  ];
}

function dmQuarterBOQ(i: DMQuarterInputs): BOQRow[] {
  const m = "DM Quarter";
  const perim = 2 * (i.L + i.W);
  const footRCC = i.colNos * i.footingL * i.footingW * i.footingD;
  const totalHt = i.wallHtGF + (i.floors > 1 ? i.wallHtFF : 0);
  const colRCC = i.colNos * i.colSize * i.colSize * totalHt;
  const slabRCC = i.L * i.W * 0.125 * i.floors;
  const beamRCC = perim * 0.23 * 0.45 * i.floors;
  const wallArea = Math.max(0, perim * (i.wallHtGF + (i.floors > 1 ? i.wallHtFF : 0)) - i.doorArea - i.windowArea);
  const plasterArea = wallArea * 2 + i.L * i.W * i.floors;
  const steel = (footRCC * SK.footing + colRCC * SK.col + slabRCC * SK.slab + beamRCC * SK.beam) / 1000;
  return [
    { code: "A-1", description: "Excavation in Foundation (DM Quarter)", unit: "Cum", qty: i.colNos * (i.footingL + 0.3) * (i.footingW + 0.3) * i.footingDepth, rate: RATES.exc, module: m },
    { code: "B-1", description: "PCC 1:4:8 Foundation Bed (DM Quarter)", unit: "Cum", qty: i.colNos * (i.footingL + 0.1) * (i.footingW + 0.1) * 0.075, rate: RATES.pcc148, module: m },
    { code: "C-1", description: "RCC M-20 Isolated Footings (DM Quarter)", unit: "Cum", qty: footRCC, rate: RATES.rccFoot, module: m },
    { code: "C-2", description: "RCC M-20 Columns (DM Quarter)", unit: "Cum", qty: colRCC, rate: RATES.rccCol, module: m },
    { code: "C-3", description: "RCC M-20 Beams (DM Quarter)", unit: "Cum", qty: beamRCC, rate: RATES.rccBeam, module: m },
    { code: "C-4", description: "RCC M-20 Slab (DM Quarter)", unit: "Cum", qty: slabRCC, rate: RATES.rccSlab, module: m },
    { code: "D-1", description: "Steel TMT Fe-500 (DM Quarter)", unit: "MT", qty: steel, rate: RATES.steel, module: m },
    { code: "E-1", description: "Brickwork 230mm in Walls (DM Quarter)", unit: "Cum", qty: wallArea * 0.23, rate: RATES.brick230, module: m },
    { code: "F-1", description: "20mm Plaster on Walls (DM Quarter)", unit: "Sqm", qty: plasterArea, rate: RATES.plas20, module: m },
    { code: "G-1", description: "Painting on Plastered Surface (DM Quarter)", unit: "Sqm", qty: plasterArea, rate: RATES.paint, module: m },
    { code: "H-1", description: "Ceramic / Vitrified Tile Flooring (DM Quarter)", unit: "Sqm", qty: i.L * i.W * i.floors, rate: RATES.floor, module: m },
    ...(i.doorArea > 0 ? [{ code: "J-1", description: "Doors & Frames (DM Quarter)", unit: "Sqm", qty: i.doorArea, rate: RATES.door, module: m }] : []),
    ...(i.windowArea > 0 ? [{ code: "J-2", description: "Windows & Frames (DM Quarter)", unit: "Sqm", qty: i.windowArea, rate: RATES.window, module: m }] : []),
  ];
}

function ohtBOQ(i: OHTInputs): BOQRow[] {
  const m = "Overhead Tank";
  const footRCC = i.footingL * i.footingW * i.footingD;
  const colRCC = i.colNos * i.colSize * i.colSize * (i.floors * i.floorHt);
  const beamRCC = 2 * (i.tankL + i.tankW) * 0.3 * 0.45 * i.floors;
  const tankRCC = 2 * (i.tankL + i.tankW) * i.tankH * 0.25 + i.tankL * i.tankW * 0.2 * 2;
  const steel = (footRCC * 80 + colRCC * SK.col + beamRCC * SK.beam + tankRCC * 150) / 1000;
  const wpArea = i.tankL * i.tankW + 2 * (i.tankL + i.tankW) * i.tankH;
  return [
    { code: "A-1", description: "Excavation in Foundation (OHT)", unit: "Cum", qty: (i.footingL + 0.3) * (i.footingW + 0.3) * i.footingDepth, rate: RATES.exc, module: m },
    { code: "B-1", description: "PCC 1:4:8 Foundation Bed (OHT)", unit: "Cum", qty: (i.footingL + 0.1) * (i.footingW + 0.1) * 0.075, rate: RATES.pcc148, module: m },
    { code: "C-1", description: "RCC M-25 Foundation Slab (OHT)", unit: "Cum", qty: footRCC, rate: RATES.rccFoot, module: m },
    { code: "C-2", description: "RCC M-25 Columns (OHT)", unit: "Cum", qty: colRCC, rate: RATES.rccCol, module: m },
    { code: "C-3", description: "RCC M-25 Beams (OHT)", unit: "Cum", qty: beamRCC, rate: RATES.rccBeam, module: m },
    { code: "C-4", description: "RCC M-25 Tank Walls & Slab", unit: "Cum", qty: tankRCC, rate: RATES.rccSlab, module: m },
    { code: "D-1", description: "Steel TMT Fe-500 (OHT)", unit: "MT", qty: steel, rate: RATES.steel, module: m },
    { code: "K-1", description: "Waterproofing Treatment in Tank (OHT)", unit: "Sqm", qty: wpArea, rate: RATES.wpTreatment, module: m },
  ];
}

function toiletBOQ(i: ToiletInputs): BOQRow[] {
  const m = "Toilet Block";
  const perim = 2 * (i.L + i.W);
  const footRCC = i.footingNos * i.footingL * i.footingW * i.footingD;
  const colRCC = i.colNos * i.colSize * i.colSize * i.wallHt;
  const slabRCC = i.L * i.W * 0.125;
  const wallArea = perim * i.wallHt * 0.8;
  const steel = (footRCC * SK.footing + colRCC * SK.col + slabRCC * SK.slab) / 1000;
  return [
    { code: "A-1", description: "Excavation in Foundation (Toilet Block)", unit: "Cum", qty: i.footingNos * (i.footingL + 0.3) * (i.footingW + 0.3) * i.footingDepth, rate: RATES.exc, module: m },
    { code: "B-1", description: "PCC 1:4:8 Foundation Bed (Toilet Block)", unit: "Cum", qty: i.footingNos * (i.footingL + 0.1) * (i.footingW + 0.1) * 0.075, rate: RATES.pcc148, module: m },
    { code: "C-1", description: "RCC M-20 Foundation (Toilet Block)", unit: "Cum", qty: footRCC, rate: RATES.rccFoot, module: m },
    { code: "C-2", description: "RCC M-20 Columns (Toilet Block)", unit: "Cum", qty: colRCC, rate: RATES.rccCol, module: m },
    { code: "C-3", description: "RCC M-20 Slab (Toilet Block)", unit: "Cum", qty: slabRCC, rate: RATES.rccSlab, module: m },
    { code: "D-1", description: "Steel TMT Fe-500 (Toilet Block)", unit: "MT", qty: steel, rate: RATES.steel, module: m },
    { code: "E-1", description: "Brickwork 230mm Walls (Toilet Block)", unit: "Cum", qty: wallArea * 0.23, rate: RATES.brick230, module: m },
    { code: "F-1", description: "Plaster + Ceramic Dado (Toilet Block)", unit: "Sqm", qty: wallArea * 2 + i.L * i.W, rate: RATES.plas20, module: m },
    { code: "H-1", description: "Anti-Skid Tile Flooring (Toilet Block)", unit: "Sqm", qty: i.L * i.W, rate: RATES.floor, module: m },
  ];
}

function oilRoomBOQ(i: OilRoomInputs): BOQRow[] {
  const m = "Oil Room";
  const area = i.fuelL * i.fuelW + i.motorL * i.motorW;
  const perim = 2 * (i.fuelL + i.fuelW) + 2 * (i.motorL + i.motorW);
  const wallArea = perim * i.wallHt * 0.75;
  return [
    { code: "E-1", description: "Brickwork 230mm (Oil Room & Fuel Cabin)", unit: "Cum", qty: wallArea * 0.23, rate: RATES.brick230, module: m },
    { code: "F-1", description: "12mm Plaster 1:4 (Oil Room)", unit: "Sqm", qty: wallArea * 2, rate: RATES.plas12, module: m },
    { code: "G-1", description: "Painting (Oil Room)", unit: "Sqm", qty: wallArea * 2, rate: RATES.paint, module: m },
    { code: "H-1", description: "CC Floor 100mm (Oil Room)", unit: "Sqm", qty: area, rate: RATES.tremix150, module: m },
    { code: "I-1", description: "GI Sheet Roofing on MS Frame (Oil Room)", unit: "Sqm", qty: area * 1.1, rate: RATES.giRoof, module: m },
  ];
}

function cwBOQ(i: CWInputs): BOQRow[] {
  const m = "Compound Wall";
  const colNos = Math.ceil(i.runningMeter / 3) + Math.ceil(i.runningMeter / 15);
  const colH = i.wallHt + i.foundDepth;
  const colRCC = colNos * i.colSize * i.colSize * colH;
  const brickCum = i.runningMeter * i.wallThickness * i.wallHt;
  const excVol = colNos * (i.colSize + 0.3) * (i.colSize + 0.3) * i.foundDepth + i.runningMeter * (i.wallThickness + 0.3) * i.foundDepth;
  return [
    { code: "A-1", description: "Excavation in Foundation (Compound Wall)", unit: "Cum", qty: excVol, rate: RATES.exc, module: m },
    { code: "B-1", description: "PCC 1:4:8 in Foundation (Compound Wall)", unit: "Cum", qty: (colNos * (i.colSize + 0.15) * (i.colSize + 0.15) + i.runningMeter * (i.wallThickness + 0.15)) * 0.075, rate: RATES.pcc148, module: m },
    { code: "C-1", description: "RCC M-20 in CW Columns", unit: "Cum", qty: colRCC, rate: RATES.rccCol, module: m },
    { code: "D-1", description: "Steel TMT Fe-500 (Compound Wall)", unit: "MT", qty: colRCC * SK.col / 1000, rate: RATES.steel, module: m },
    { code: "E-1", description: "Brickwork 230mm Compound Wall Panel", unit: "Cum", qty: brickCum, rate: RATES.brick230, module: m },
    { code: "F-1", description: "20mm Plaster on Compound Wall (Both Sides)", unit: "Sqm", qty: i.runningMeter * i.wallHt * 2, rate: RATES.plas20, module: m },
    { code: "F-2", description: "CC Coping on Top of Compound Wall", unit: "Rm", qty: i.runningMeter, rate: RATES.coping, module: m },
  ];
}

function ccBOQ(i: CCInputs): BOQRow[] {
  const m = "CC Trimix Yard";
  const rows: BOQRow[] = [{ code: "H-1", description: "CC Tremix Road M-30 200mm thick", unit: "Sqm", qty: i.roadArea, rate: RATES.tremix200, module: m }];
  if (i.paverArea > 0) rows.push({ code: "H-2", description: "Paver Block 80mm on Footpath/Parking", unit: "Sqm", qty: i.paverArea, rate: RATES.paver, module: m });
  return rows;
}

function swBOQ(i: SWInputs): BOQRow[] {
  const m = "Storm Water";
  const totalL = i.mainL + i.branchL;
  const drainRCC = totalL * ((i.drainW + 2 * i.drainThick) * (i.drainH + i.drainThick) - i.drainW * i.drainH);
  return [
    { code: "A-1", description: "Excavation for Storm Water Drain", unit: "Cum", qty: totalL * (i.drainW + 0.6) * (i.drainH + 0.4), rate: RATES.exc, module: m },
    { code: "B-1", description: "PCC 1:4:8 Bed for Storm Water Drain", unit: "Cum", qty: totalL * (i.drainW + 0.3) * 0.075, rate: RATES.pcc148, module: m },
    { code: "C-1", description: "RCC M-20 Drain Walls & Floor", unit: "Cum", qty: drainRCC, rate: RATES.drain, module: m },
    { code: "D-1", description: "Steel TMT Fe-500 (Storm Water Drain)", unit: "MT", qty: drainRCC * 80 / 1000, rate: RATES.steel, module: m },
    { code: "F-1", description: "CC Precast Cover Slab for Drain", unit: "Nos", qty: Math.ceil(totalL / 0.6), rate: RATES.precastCover, module: m },
  ];
}

function computeTotals(totalRs: number) {
  const wc = totalRs * 0.01, tender = totalRs + wc, gst = tender * 0.18;
  const withGST = tender + gst, cont5 = withGST * 0.05, cont2 = withGST * 0.02;
  const estimated = withGST + cont5 + cont2, say = Math.ceil(estimated / 1000) * 1000;
  return { wc, tender, gst, withGST, cont5, cont2, estimated, say };
}

// ─── SVG Column Grid ──────────────────────────────────────────────────────────

function ColGrid({ colsX, colsY, L, W, label }: { colsX: number; colsY: number; L: number; W: number; label?: string }) {
  const vw = 260, vh = 160, pad = 20;
  const gw = vw - pad * 2, gh = vh - pad * 2;
  const scaleX = gw / Math.max(1, colsX - 1);
  const scaleY = gh / Math.max(1, colsY - 1);
  const cx = (c: number) => pad + c * scaleX;
  const cy = (r: number) => pad + r * scaleY;
  const colType = (c: number, r: number): string => {
    const isEdgeC = c === 0 || c === colsX - 1;
    const isEdgeR = r === 0 || r === colsY - 1;
    if (isEdgeC && isEdgeR) return "#dc2626";       // corner
    if (isEdgeC || isEdgeR) return "#ea580c";       // edge
    return "#2563eb";                                // interior
  };
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < colsY; r++) {
    for (let c = 0; c < colsX; c++) {
      dots.push(<circle key={`${c}-${r}`} cx={cx(c)} cy={cy(r)} r={colsX > 10 ? 3 : 4} fill={colType(c, r)} opacity={0.9} />);
    }
  }
  const gridLines: React.ReactNode[] = [];
  for (let c = 0; c < colsX; c++) gridLines.push(<line key={`v${c}`} x1={cx(c)} y1={cy(0)} x2={cx(c)} y2={cy(colsY - 1)} stroke="#e2e8f0" strokeWidth={1} />);
  for (let r = 0; r < colsY; r++) gridLines.push(<line key={`h${r}`} x1={cx(0)} y1={cy(r)} x2={cx(colsX - 1)} y2={cy(r)} stroke="#e2e8f0" strokeWidth={1} />);

  return (
    <div className="relative">
      <svg width={vw} height={vh} className="rounded-lg bg-slate-50 border border-slate-200">
        <rect x={pad} y={pad} width={gw} height={gh} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
        {gridLines}
        {dots}
        {label && <text x={vw / 2} y={vh - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">{label}</text>}
      </svg>
      <div className="flex items-center gap-3 mt-1.5 text-xs">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Corner ({4})</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> Edge ({(colsX - 2) * 2 + (colsY - 2) * 2})</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Interior ({Math.max(0, colsX - 2) * Math.max(0, colsY - 2)})</span>
      </div>
    </div>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────

function Num({ label, unit, value, onChange, min = 0, step = "any", labelW = "w-32" }: {
  label: string; unit?: string; value: number; onChange: (v: number) => void;
  min?: number; step?: string; labelW?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className={`text-xs text-slate-600 ${labelW} shrink-0`}>{label}</label>
      <input type="number" min={min} step={step} value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-right font-mono" />
      {unit && <span className="text-xs text-slate-400">{unit}</span>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── Module config ────────────────────────────────────────────────────────────

const MODULES = [
  { id: "workshop",  name: "Main Workshop",   icon: "🏭", desc: "Main depot building with PEB roof" },
  { id: "dmQuarter", name: "DM Quarter",       icon: "🏠", desc: "Depot Manager residence (G+1)" },
  { id: "oht",       name: "Overhead Tank",    icon: "🏗️", desc: "RCC overhead water tank on staging" },
  { id: "toilet",    name: "Toilet Block",     icon: "🚿", desc: "Common toilet block" },
  { id: "oilRoom",   name: "Oil Room",         icon: "⛽", desc: "Fuel cabin + motor room" },
  { id: "cw",        name: "Compound Wall",    icon: "🧱", desc: "Perimeter boundary wall" },
  { id: "cc",        name: "CC / Road Yard",   icon: "🛣️", desc: "Tremix road & paver yard" },
  { id: "sw",        name: "Storm Water",      icon: "💧", desc: "Surface drainage channels" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepotWizardPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["workshop", "cw"]));
  const [expanded, setExpanded] = useState<string | null>("workshop");
  // "drawing" | "params" — which panel is shown per module
  const [panelMode, setPanelMode] = useState<Record<string, "drawing" | "params">>({ workshop: "drawing", dmQuarter: "drawing" });
  const [generating, setGenerating] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [sorYear, setSorYear] = useState(SOR_YEARS[0]);
  const [sorDivision, setSorDivision] = useState("");

  // Drawing-level states
  const [wsDrw, setWsDrw] = useState<WorkshopDrawing>(DEF_WS_DRW);
  const [dmDrw, setDmDrw] = useState<DMDrawing>(DEF_DM_DRW);

  // Derived or manual param states
  const [workshop, setWorkshop] = useState<WorkshopInputs>(() => deriveWorkshop(DEF_WS_DRW));
  const [dm, setDM] = useState<DMQuarterInputs>(() => deriveDM(DEF_DM_DRW));

  const [oht, setOHT] = useState<OHTInputs>({ footingL: 6.51, footingW: 6.51, footingD: 0.6, footingDepth: 1.8, colNos: 4, colSize: 0.45, floors: 4, floorHt: 3.0, tankL: 4.0, tankW: 4.0, tankH: 2.5 });
  const [toilet, setToilet] = useState<ToiletInputs>({ L: 10.72, W: 5.675, footingNos: 8, footingL: 2.6, footingW: 2.7, footingD: 0.45, footingDepth: 1.5, colNos: 8, colSize: 0.25, wallHt: 3.2 });
  const [oilRoom, setOilRoom] = useState<OilRoomInputs>({ fuelL: 4.0, fuelW: 4.0, motorL: 3.0, motorW: 3.0, wallHt: 3.5 });
  const [cw, setCW] = useState<CWInputs>({ runningMeter: 320, colSize: 0.3, wallThickness: 0.23, wallHt: 2.1, foundDepth: 0.9 });
  const [cc, setCC] = useState<CCInputs>({ roadArea: 5000, roadThick: 0.20, paverArea: 1000 });
  const [sw, setSW] = useState<SWInputs>({ mainL: 150, branchL: 50, drainW: 0.45, drainH: 0.45, drainThick: 0.15 });

  // Apply drawing → params
  const applyWsDrawing = useCallback(() => {
    setWorkshop(deriveWorkshop(wsDrw));
    setPanelMode((p) => ({ ...p, workshop: "params" }));
  }, [wsDrw]);

  const applyDmDrawing = useCallback(() => {
    setDM(deriveDM(dmDrw));
    setPanelMode((p) => ({ ...p, dmQuarter: "params" }));
  }, [dmDrw]);

  // Footing editor
  const addFooting = () => setWorkshop((p) => ({ ...p, footings: [...p.footings, { id: Math.random().toString(36).slice(2, 6), label: `F${p.footings.length + 1}`, nos: 1, L: 2.0, W: 2.0, D: 0.45, depth: 1.8 }] }));
  const updFooting = (id: string, key: keyof FootingType, val: number | string) => setWorkshop((p) => ({ ...p, footings: p.footings.map((f) => f.id !== id ? f : { ...f, [key]: val }) }));
  const delFooting = (id: string) => setWorkshop((p) => ({ ...p, footings: p.footings.filter((f) => f.id !== id) }));

  // Workshop drawing derived grid stats
  const wsBaysX = Math.max(1, Math.round(wsDrw.L / wsDrw.bayL));
  const wsBaysY = Math.max(1, Math.round(wsDrw.W / wsDrw.bayW));
  const wsColsX = wsBaysX + 1, wsColsY = wsBaysY + 1;
  const wsColTotal = wsColsX * wsColsY;

  // DM drawing grid
  const dmColsX = dmDrw.baysX + 1, dmColsY = dmDrw.baysY + 1;
  const dmColTotal = dmColsX * dmColsY;

  // Live BOQ
  const allBOQ = useMemo<BOQRow[]>(() => {
    const rows: BOQRow[] = [];
    if (enabled.has("workshop")) rows.push(...workshopBOQ(workshop));
    if (enabled.has("dmQuarter")) rows.push(...dmQuarterBOQ(dm));
    if (enabled.has("oht")) rows.push(...ohtBOQ(oht));
    if (enabled.has("toilet")) rows.push(...toiletBOQ(toilet));
    if (enabled.has("oilRoom")) rows.push(...oilRoomBOQ(oilRoom));
    if (enabled.has("cw")) rows.push(...cwBOQ(cw));
    if (enabled.has("cc")) rows.push(...ccBOQ(cc));
    if (enabled.has("sw")) rows.push(...swBOQ(sw));
    return rows;
  }, [enabled, workshop, dm, oht, toilet, oilRoom, cw, cc, sw]);

  const totalRs = allBOQ.reduce((s, r) => s + r.qty * r.rate, 0);
  const totals = computeTotals(totalRs);

  const toggleModule = (id: string) => {
    setEnabled((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setExpanded((p) => p === id ? null : id);
  };

  const fmtRs = (n: number) => "₹ " + Math.round(n).toLocaleString("en-IN");
  const fmt3 = (n: number) => n < 0.0005 ? "0.000" : n.toFixed(3);

  const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const handleGenerate = async () => {
    if (!projectName.trim()) { toast({ title: "Please enter a project name", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const body = {
        name: projectName.trim(), sorYear, sorDivision,
        enabledModules: [...enabled],
        boqItems: allBOQ.map((r, idx) => ({ itemCode: r.code, description: r.description, unit: r.unit, quantity: r.qty, rate: r.rate, amount: r.qty * r.rate, sortOrder: idx + 1, chapter: r.module })),
        breakdown: { totalRs, ...totals },
      };
      const res = await fetch("/api/wizard/depot/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const { projectId } = await res.json();
      toast({ title: "Depot project created!", variant: "success" });
      router.push(`/dashboard/projects/${projectId}`);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const DrawingBadge = ({ moduleId, onToggle }: { moduleId: string; onToggle: () => void }) => {
    const isDrawing = panelMode[moduleId] === "drawing";
    return (
      <button onClick={onToggle}
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${isDrawing ? "bg-violet-100 text-violet-700 border-violet-300" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"}`}>
        {isDrawing ? <PenTool className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
        {isDrawing ? "Drawing Mode" : "Manual Mode"}
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Depot / Workshop Smart Wizard</h1>
          <p className="text-slate-500 text-sm">Drawing wizard → parameters auto-filled → live BOQ calculated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6">
        {/* ─── Left: Inputs ─── */}
        <div className="space-y-4">

          {/* Module selector */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select Building Modules</div>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((mod) => {
                const isOn = enabled.has(mod.id);
                return (
                  <button key={mod.id} onClick={() => toggleModule(mod.id)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${isOn ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{mod.icon}</span>
                      <div>
                        <div className={`font-semibold text-xs leading-tight ${isOn ? "text-blue-800" : "text-slate-700"}`}>{mod.name}</div>
                        <div className="text-xs text-slate-400 leading-tight mt-0.5 hidden sm:block">{mod.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input panels per enabled module */}
          {MODULES.filter((m) => enabled.has(m.id)).map((mod) => {
            const isOpen = expanded === mod.id;
            const mode = panelMode[mod.id] || "params";
            return (
              <div key={mod.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Module header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <button onClick={() => setExpanded(isOpen ? null : mod.id)} className="flex items-center gap-2 flex-1 text-left">
                    <span className="text-xl">{mod.icon}</span>
                    <span className="font-semibold text-slate-800 text-sm flex-1">{mod.name}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {(mod.id === "workshop" || mod.id === "dmQuarter") && isOpen && (
                    <DrawingBadge moduleId={mod.id} onToggle={() => setPanelMode((p) => ({ ...p, [mod.id]: p[mod.id] === "drawing" ? "params" : "drawing" }))} />
                  )}
                </div>

                {isOpen && (
                  <div className="px-4 py-4 space-y-4">

                    {/* ─── Workshop ─── */}
                    {mod.id === "workshop" && (
                      <>
                        {/* Drawing Wizard panel */}
                        {mode === "drawing" && (
                          <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 space-y-4">
                            <div className="flex items-center gap-2">
                              <PenTool className="w-4 h-4 text-violet-600" />
                              <span className="font-semibold text-violet-800 text-sm">Drawing Wizard</span>
                              <span className="text-xs text-violet-500 ml-auto">Enter from structural drawing</span>
                            </div>

                            {/* Building & Bay grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              <Num label="Building L" unit="m" value={wsDrw.L} onChange={(v) => setWsDrw((p) => ({ ...p, L: v }))} labelW="w-24" />
                              <Num label="Building W" unit="m" value={wsDrw.W} onChange={(v) => setWsDrw((p) => ({ ...p, W: v }))} labelW="w-24" />
                              <Num label="Bay Spacing X" unit="m" value={wsDrw.bayL} onChange={(v) => setWsDrw((p) => ({ ...p, bayL: v }))} labelW="w-24" />
                              <Num label="Bay Spacing Y" unit="m" value={wsDrw.bayW} onChange={(v) => setWsDrw((p) => ({ ...p, bayW: v }))} labelW="w-24" />
                              <Num label="Column Size □" unit="m" value={wsDrw.colSize} onChange={(v) => setWsDrw((p) => ({ ...p, colSize: v }))} labelW="w-24" />
                            </div>

                            {/* Grid stats + SVG */}
                            <div className="bg-white rounded-lg p-3 border border-violet-200">
                              <div className="flex gap-4 text-xs mb-3 text-slate-600">
                                <span><b className="text-slate-800">{wsBaysX}×{wsBaysY}</b> bays</span>
                                <span><b className="text-slate-800">{wsColsX}×{wsColsY}</b> columns</span>
                                <span><b className="text-blue-700">{wsColTotal}</b> total</span>
                              </div>
                              <ColGrid colsX={wsColsX} colsY={wsColsY} L={wsDrw.L} W={wsDrw.W} label={`${wsDrw.L}m × ${wsDrw.W}m`} />
                            </div>

                            {/* Footing zones */}
                            <div>
                              <div className="text-xs font-semibold text-violet-700 mb-2">Footing Sizes by Zone</div>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                  <span className="text-slate-600 w-16 shrink-0">Corner (4)</span>
                                  <input type="number" step="any" value={wsDrw.fCornerL || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fCornerL: parseFloat(e.target.value) || 0 }))} placeholder="L" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">×</span>
                                  <input type="number" step="any" value={wsDrw.fCornerW || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fCornerW: parseFloat(e.target.value) || 0 }))} placeholder="W" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">D</span>
                                  <input type="number" step="any" value={wsDrw.fCornerD || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fCornerD: parseFloat(e.target.value) || 0 }))} placeholder="D" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                                  <span className="text-slate-600 w-16 shrink-0">Edge-L ({(wsColsX - 2) * 2})</span>
                                  <input type="number" step="any" value={wsDrw.fEdgeLL || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fEdgeLL: parseFloat(e.target.value) || 0 }))} placeholder="L" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">×</span>
                                  <input type="number" step="any" value={wsDrw.fEdgeLW || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fEdgeLW: parseFloat(e.target.value) || 0 }))} placeholder="W" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">D</span>
                                  <input type="number" step="any" value={wsDrw.fEdgeLD || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fEdgeLD: parseFloat(e.target.value) || 0 }))} placeholder="D" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                                  <span className="text-slate-600 w-16 shrink-0">Edge-S ({(wsColsY - 2) * 2})</span>
                                  <input type="number" step="any" value={wsDrw.fEdgeSL || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fEdgeSL: parseFloat(e.target.value) || 0 }))} placeholder="L" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">×</span>
                                  <input type="number" step="any" value={wsDrw.fEdgeSW || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fEdgeSW: parseFloat(e.target.value) || 0 }))} placeholder="W" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">D</span>
                                  <input type="number" step="any" value={wsDrw.fEdgeSD || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fEdgeSD: parseFloat(e.target.value) || 0 }))} placeholder="D" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                                  <span className="text-slate-600 w-16 shrink-0">Interior ({Math.max(0, wsColsX - 2) * Math.max(0, wsColsY - 2)})</span>
                                  <input type="number" step="any" value={wsDrw.fIntL || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fIntL: parseFloat(e.target.value) || 0 }))} placeholder="L" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">×</span>
                                  <input type="number" step="any" value={wsDrw.fIntW || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fIntW: parseFloat(e.target.value) || 0 }))} placeholder="W" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                  <span className="text-slate-400">D</span>
                                  <input type="number" step="any" value={wsDrw.fIntD || ""} onChange={(e) => setWsDrw((p) => ({ ...p, fIntD: parseFloat(e.target.value) || 0 }))} placeholder="D" className="w-14 px-1.5 py-1 border border-slate-200 rounded text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                </div>
                              </div>
                            </div>

                            {/* Foundation & height */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              <Num label="Found. Depth" unit="m" value={wsDrw.foundDepth} onChange={(v) => setWsDrw((p) => ({ ...p, foundDepth: v }))} labelW="w-24" />
                              <Num label="Plinth Ht" unit="m" value={wsDrw.plinthHt} onChange={(v) => setWsDrw((p) => ({ ...p, plinthHt: v }))} labelW="w-24" />
                              <Num label="Column Ht" unit="m" value={wsDrw.colHt} onChange={(v) => setWsDrw((p) => ({ ...p, colHt: v }))} labelW="w-24" />
                            </div>

                            {/* Service pits */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              <Num label="L-Pit Count" value={wsDrw.pitL_count} onChange={(v) => setWsDrw((p) => ({ ...p, pitL_count: v }))} labelW="w-24" />
                              <Num label="U-Pit Count" value={wsDrw.pitU_count} onChange={(v) => setWsDrw((p) => ({ ...p, pitU_count: v }))} labelW="w-24" />
                              <Num label="Window Area" unit="m²" value={wsDrw.windowArea} onChange={(v) => setWsDrw((p) => ({ ...p, windowArea: v }))} labelW="w-24" />
                              <Num label="Door Area" unit="m²" value={wsDrw.doorArea} onChange={(v) => setWsDrw((p) => ({ ...p, doorArea: v }))} labelW="w-24" />
                            </div>

                            <button onClick={applyWsDrawing}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">
                              <CheckCircle2 className="w-4 h-4" />
                              Apply to Parameters ({wsColTotal} columns, {workshop.footings.length} footing types)
                            </button>
                          </div>
                        )}

                        {/* Parameters panel */}
                        {mode === "params" && (
                          <div className="space-y-3">
                            {panelMode.workshop === "params" && (
                              <div className="flex items-center gap-2 text-xs bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                                <span className="text-violet-700">Parameters filled from drawing · {workshop.footings.length} footing types auto-detected</span>
                                <button onClick={() => setPanelMode((p) => ({ ...p, workshop: "drawing" }))} className="ml-auto text-violet-600 hover:underline">Edit drawing</button>
                              </div>
                            )}
                            <Section title="Building Dimensions">
                              <Num label="Length (L)" unit="m" value={workshop.L} onChange={(v) => setWorkshop((p) => ({ ...p, L: v, roofArea: v * p.W }))} />
                              <Num label="Width (W)" unit="m" value={workshop.W} onChange={(v) => setWorkshop((p) => ({ ...p, W: v, roofArea: p.L * v }))} />
                              <Num label="Column Size □" unit="m" value={workshop.colSize} onChange={(v) => setWorkshop((p) => ({ ...p, colSize: v }))} />
                              <Num label="Plinth Height" unit="m" value={workshop.plinthHt} onChange={(v) => setWorkshop((p) => ({ ...p, plinthHt: v }))} />
                              <Num label="Column Height" unit="m" value={workshop.colHt} onChange={(v) => setWorkshop((p) => ({ ...p, colHt: v }))} />
                            </Section>
                            <Section title="Ground Beam">
                              <Num label="Width" unit="m" value={workshop.gbW} onChange={(v) => setWorkshop((p) => ({ ...p, gbW: v }))} />
                              <Num label="Height" unit="m" value={workshop.gbH} onChange={(v) => setWorkshop((p) => ({ ...p, gbH: v }))} />
                            </Section>
                            <Section title="Footings (Isolated)">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs min-w-[380px]">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-100">
                                      <th className="text-left pb-1 pr-1 font-medium w-16">Type</th>
                                      <th className="text-center pb-1 px-1 font-medium w-10">Nos</th>
                                      <th className="text-center pb-1 px-1 font-medium w-14">L</th>
                                      <th className="text-center pb-1 px-1 font-medium w-14">W</th>
                                      <th className="text-center pb-1 px-1 font-medium w-14">D</th>
                                      <th className="text-center pb-1 px-1 font-medium w-14">Depth</th>
                                      <th className="w-5"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {workshop.footings.map((f) => (
                                      <tr key={f.id}>
                                        <td className="py-1 pr-1"><input type="text" value={f.label} onChange={(e) => updFooting(f.id, "label", e.target.value)} className="w-16 px-1 py-1 border border-slate-200 rounded text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" /></td>
                                        {(["nos", "L", "W", "D", "depth"] as (keyof FootingType)[]).map((k) => (
                                          <td key={k} className="py-1 px-1"><input type="number" step="any" value={(f[k] as number) || ""} onChange={(e) => updFooting(f.id, k, parseFloat(e.target.value) || 0)} className="w-full px-1 py-1 border border-slate-200 rounded text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" /></td>
                                        ))}
                                        <td className="py-1 pl-1"><button onClick={() => delFooting(f.id)} className="p-1 text-slate-300 hover:text-red-500 rounded"><X className="w-3 h-3" /></button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <button onClick={addFooting} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"><Plus className="w-3.5 h-3.5" /> Add Footing Type</button>
                            </Section>
                            <Section title="Service Pits">
                              <Num label="L-Type Count" value={workshop.pitL_count} onChange={(v) => setWorkshop((p) => ({ ...p, pitL_count: v }))} />
                              <Num label="L-Type Length" unit="m" value={workshop.pitL} onChange={(v) => setWorkshop((p) => ({ ...p, pitL: v }))} />
                              <Num label="L-Type Width" unit="m" value={workshop.pitLW} onChange={(v) => setWorkshop((p) => ({ ...p, pitLW: v }))} />
                              <Num label="L-Type Depth" unit="m" value={workshop.pitLH} onChange={(v) => setWorkshop((p) => ({ ...p, pitLH: v }))} />
                              <Num label="U-Type Count" value={workshop.pitU_count} onChange={(v) => setWorkshop((p) => ({ ...p, pitU_count: v }))} />
                              <Num label="U-Type Length" unit="m" value={workshop.pitU} onChange={(v) => setWorkshop((p) => ({ ...p, pitU: v }))} />
                              <Num label="U-Type Width" unit="m" value={workshop.pitUW} onChange={(v) => setWorkshop((p) => ({ ...p, pitUW: v }))} />
                              <Num label="U-Type Depth" unit="m" value={workshop.pitUH} onChange={(v) => setWorkshop((p) => ({ ...p, pitUH: v }))} />
                            </Section>
                            <Section title="Openings & Roof">
                              <Num label="Window Area" unit="m²" value={workshop.windowArea} onChange={(v) => setWorkshop((p) => ({ ...p, windowArea: v }))} />
                              <Num label="Door / Shutter" unit="m²" value={workshop.doorArea} onChange={(v) => setWorkshop((p) => ({ ...p, doorArea: v }))} />
                              <Num label="PEB Roof Area" unit="m²" value={workshop.roofArea} onChange={(v) => setWorkshop((p) => ({ ...p, roofArea: v }))} />
                            </Section>
                          </div>
                        )}
                      </>
                    )}

                    {/* ─── DM Quarter ─── */}
                    {mod.id === "dmQuarter" && (
                      <>
                        {mode === "drawing" && (
                          <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 space-y-4">
                            <div className="flex items-center gap-2">
                              <PenTool className="w-4 h-4 text-violet-600" />
                              <span className="font-semibold text-violet-800 text-sm">Drawing Wizard — DM Quarter</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              <Num label="Building L" unit="m" value={dmDrw.L} onChange={(v) => setDmDrw((p) => ({ ...p, L: v }))} labelW="w-24" />
                              <Num label="Building W" unit="m" value={dmDrw.W} onChange={(v) => setDmDrw((p) => ({ ...p, W: v }))} labelW="w-24" />
                              <Num label="Bays X" value={dmDrw.baysX} onChange={(v) => setDmDrw((p) => ({ ...p, baysX: v }))} labelW="w-24" />
                              <Num label="Bays Y" value={dmDrw.baysY} onChange={(v) => setDmDrw((p) => ({ ...p, baysY: v }))} labelW="w-24" />
                              <Num label="Col Size □" unit="m" value={dmDrw.colSize} onChange={(v) => setDmDrw((p) => ({ ...p, colSize: v }))} labelW="w-24" />
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-600 w-24 shrink-0">Floors</label>
                                <select value={dmDrw.floors} onChange={(e) => setDmDrw((p) => ({ ...p, floors: parseInt(e.target.value) }))} className="w-24 px-2 py-1 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                                  <option value={1}>G (Ground)</option><option value={2}>G+1</option>
                                </select>
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-violet-200">
                              <div className="flex gap-4 text-xs mb-3 text-slate-600">
                                <span><b>{dmColsX}×{dmColsY}</b> grid</span>
                                <span><b className="text-blue-700">{dmColTotal}</b> columns</span>
                                <span><b>{dmDrw.L}m × {dmDrw.W}m</b></span>
                              </div>
                              <ColGrid colsX={dmColsX} colsY={dmColsY} L={dmDrw.L} W={dmDrw.W} label={`DM Quarter (${dmDrw.floors === 2 ? "G+1" : "G"})`} />
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              <Num label="Footing L" unit="m" value={dmDrw.footingL} onChange={(v) => setDmDrw((p) => ({ ...p, footingL: v }))} labelW="w-24" />
                              <Num label="Footing W" unit="m" value={dmDrw.footingW} onChange={(v) => setDmDrw((p) => ({ ...p, footingW: v }))} labelW="w-24" />
                              <Num label="Footing D" unit="m" value={dmDrw.footingD} onChange={(v) => setDmDrw((p) => ({ ...p, footingD: v }))} labelW="w-24" />
                              <Num label="Exc. Depth" unit="m" value={dmDrw.footingDepth} onChange={(v) => setDmDrw((p) => ({ ...p, footingDepth: v }))} labelW="w-24" />
                              <Num label="Wall Ht GF" unit="m" value={dmDrw.wallHtGF} onChange={(v) => setDmDrw((p) => ({ ...p, wallHtGF: v }))} labelW="w-24" />
                              {dmDrw.floors > 1 && <Num label="Wall Ht FF" unit="m" value={dmDrw.wallHtFF} onChange={(v) => setDmDrw((p) => ({ ...p, wallHtFF: v }))} labelW="w-24" />}
                              <Num label="Window Area" unit="m²" value={dmDrw.windowArea} onChange={(v) => setDmDrw((p) => ({ ...p, windowArea: v }))} labelW="w-24" />
                              <Num label="Door Area" unit="m²" value={dmDrw.doorArea} onChange={(v) => setDmDrw((p) => ({ ...p, doorArea: v }))} labelW="w-24" />
                            </div>
                            <button onClick={applyDmDrawing} className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">
                              <CheckCircle2 className="w-4 h-4" />
                              Apply to Parameters ({dmColTotal} columns from {dmDrw.baysX}×{dmDrw.baysY} grid)
                            </button>
                          </div>
                        )}

                        {mode === "params" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                              <span className="text-violet-700">Filled from {dmDrw.baysX}×{dmDrw.baysY} grid → {dmColTotal} columns</span>
                              <button onClick={() => setPanelMode((p) => ({ ...p, dmQuarter: "drawing" }))} className="ml-auto text-violet-600 hover:underline">Edit drawing</button>
                            </div>
                            <Section title="Building">
                              <Num label="Length (L)" unit="m" value={dm.L} onChange={(v) => setDM((p) => ({ ...p, L: v }))} />
                              <Num label="Width (W)" unit="m" value={dm.W} onChange={(v) => setDM((p) => ({ ...p, W: v }))} />
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-600 w-32 shrink-0">Floors</label>
                                <select value={dm.floors} onChange={(e) => setDM((p) => ({ ...p, floors: parseInt(e.target.value) }))} className="w-24 px-2 py-1 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                                  <option value={1}>G</option><option value={2}>G+1</option>
                                </select>
                              </div>
                              <Num label="Wall Ht GF" unit="m" value={dm.wallHtGF} onChange={(v) => setDM((p) => ({ ...p, wallHtGF: v }))} />
                              {dm.floors > 1 && <Num label="Wall Ht FF" unit="m" value={dm.wallHtFF} onChange={(v) => setDM((p) => ({ ...p, wallHtFF: v }))} />}
                            </Section>
                            <Section title="Columns & Footings">
                              <Num label="Column Count" value={dm.colNos} onChange={(v) => setDM((p) => ({ ...p, colNos: v }))} />
                              <Num label="Column Size □" unit="m" value={dm.colSize} onChange={(v) => setDM((p) => ({ ...p, colSize: v }))} />
                              <Num label="Footing L" unit="m" value={dm.footingL} onChange={(v) => setDM((p) => ({ ...p, footingL: v }))} />
                              <Num label="Footing W" unit="m" value={dm.footingW} onChange={(v) => setDM((p) => ({ ...p, footingW: v }))} />
                              <Num label="Footing D" unit="m" value={dm.footingD} onChange={(v) => setDM((p) => ({ ...p, footingD: v }))} />
                              <Num label="Exc. Depth" unit="m" value={dm.footingDepth} onChange={(v) => setDM((p) => ({ ...p, footingDepth: v }))} />
                            </Section>
                            <Section title="Openings">
                              <Num label="Window Area" unit="m²" value={dm.windowArea} onChange={(v) => setDM((p) => ({ ...p, windowArea: v }))} />
                              <Num label="Door Area" unit="m²" value={dm.doorArea} onChange={(v) => setDM((p) => ({ ...p, doorArea: v }))} />
                            </Section>
                          </div>
                        )}
                      </>
                    )}

                    {/* ─── OHT ─── */}
                    {mod.id === "oht" && (
                      <>
                        <Section title="Foundation">
                          <Num label="Footing L" unit="m" value={oht.footingL} onChange={(v) => setOHT((p) => ({ ...p, footingL: v }))} />
                          <Num label="Footing W" unit="m" value={oht.footingW} onChange={(v) => setOHT((p) => ({ ...p, footingW: v }))} />
                          <Num label="Footing Thickness" unit="m" value={oht.footingD} onChange={(v) => setOHT((p) => ({ ...p, footingD: v }))} />
                          <Num label="Excavation Depth" unit="m" value={oht.footingDepth} onChange={(v) => setOHT((p) => ({ ...p, footingDepth: v }))} />
                        </Section>
                        <Section title="Staging">
                          <Num label="Column Count" value={oht.colNos} onChange={(v) => setOHT((p) => ({ ...p, colNos: v }))} />
                          <Num label="Column Size □" unit="m" value={oht.colSize} onChange={(v) => setOHT((p) => ({ ...p, colSize: v }))} />
                          <Num label="No. of Floors" value={oht.floors} onChange={(v) => setOHT((p) => ({ ...p, floors: v }))} />
                          <Num label="Floor Height" unit="m" value={oht.floorHt} onChange={(v) => setOHT((p) => ({ ...p, floorHt: v }))} />
                        </Section>
                        <Section title="Tank">
                          <Num label="Tank L" unit="m" value={oht.tankL} onChange={(v) => setOHT((p) => ({ ...p, tankL: v }))} />
                          <Num label="Tank W" unit="m" value={oht.tankW} onChange={(v) => setOHT((p) => ({ ...p, tankW: v }))} />
                          <Num label="Tank H" unit="m" value={oht.tankH} onChange={(v) => setOHT((p) => ({ ...p, tankH: v }))} />
                        </Section>
                      </>
                    )}

                    {/* ─── Toilet ─── */}
                    {mod.id === "toilet" && (
                      <>
                        <Section title="Building">
                          <Num label="Length (L)" unit="m" value={toilet.L} onChange={(v) => setToilet((p) => ({ ...p, L: v }))} />
                          <Num label="Width (W)" unit="m" value={toilet.W} onChange={(v) => setToilet((p) => ({ ...p, W: v }))} />
                          <Num label="Wall Height" unit="m" value={toilet.wallHt} onChange={(v) => setToilet((p) => ({ ...p, wallHt: v }))} />
                        </Section>
                        <Section title="Structure">
                          <Num label="Footing Count" value={toilet.footingNos} onChange={(v) => setToilet((p) => ({ ...p, footingNos: v }))} />
                          <Num label="Footing L" unit="m" value={toilet.footingL} onChange={(v) => setToilet((p) => ({ ...p, footingL: v }))} />
                          <Num label="Footing W" unit="m" value={toilet.footingW} onChange={(v) => setToilet((p) => ({ ...p, footingW: v }))} />
                          <Num label="Footing D" unit="m" value={toilet.footingD} onChange={(v) => setToilet((p) => ({ ...p, footingD: v }))} />
                          <Num label="Exc. Depth" unit="m" value={toilet.footingDepth} onChange={(v) => setToilet((p) => ({ ...p, footingDepth: v }))} />
                          <Num label="Column Count" value={toilet.colNos} onChange={(v) => setToilet((p) => ({ ...p, colNos: v }))} />
                          <Num label="Column Size □" unit="m" value={toilet.colSize} onChange={(v) => setToilet((p) => ({ ...p, colSize: v }))} />
                        </Section>
                      </>
                    )}

                    {/* ─── Oil Room ─── */}
                    {mod.id === "oilRoom" && (
                      <>
                        <Section title="Fuel Cabin">
                          <Num label="Length" unit="m" value={oilRoom.fuelL} onChange={(v) => setOilRoom((p) => ({ ...p, fuelL: v }))} />
                          <Num label="Width" unit="m" value={oilRoom.fuelW} onChange={(v) => setOilRoom((p) => ({ ...p, fuelW: v }))} />
                        </Section>
                        <Section title="Motor Room">
                          <Num label="Length" unit="m" value={oilRoom.motorL} onChange={(v) => setOilRoom((p) => ({ ...p, motorL: v }))} />
                          <Num label="Width" unit="m" value={oilRoom.motorW} onChange={(v) => setOilRoom((p) => ({ ...p, motorW: v }))} />
                        </Section>
                        <Section title="Common">
                          <Num label="Wall Height" unit="m" value={oilRoom.wallHt} onChange={(v) => setOilRoom((p) => ({ ...p, wallHt: v }))} />
                        </Section>
                      </>
                    )}

                    {/* ─── Compound Wall ─── */}
                    {mod.id === "cw" && (
                      <>
                        <Section title="Dimensions">
                          <Num label="Running Meter" unit="Rm" value={cw.runningMeter} onChange={(v) => setCW((p) => ({ ...p, runningMeter: v }))} />
                          <Num label="Wall Height" unit="m" value={cw.wallHt} onChange={(v) => setCW((p) => ({ ...p, wallHt: v }))} />
                          <Num label="Wall Thickness" unit="m" value={cw.wallThickness} onChange={(v) => setCW((p) => ({ ...p, wallThickness: v }))} />
                          <Num label="Column Size □" unit="m" value={cw.colSize} onChange={(v) => setCW((p) => ({ ...p, colSize: v }))} />
                          <Num label="Foundation Depth" unit="m" value={cw.foundDepth} onChange={(v) => setCW((p) => ({ ...p, foundDepth: v }))} />
                        </Section>
                        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          ⚡ Columns auto: ceil({cw.runningMeter}/3) + ceil({cw.runningMeter}/15) = <strong>{Math.ceil(cw.runningMeter / 3) + Math.ceil(cw.runningMeter / 15)} nos</strong>
                        </div>
                      </>
                    )}

                    {/* ─── CC ─── */}
                    {mod.id === "cc" && (
                      <Section title="Areas">
                        <Num label="CC Tremix Road" unit="m²" value={cc.roadArea} onChange={(v) => setCC((p) => ({ ...p, roadArea: v }))} />
                        <Num label="Road Thickness" unit="m" value={cc.roadThick} onChange={(v) => setCC((p) => ({ ...p, roadThick: v }))} step="0.05" />
                        <Num label="Paver Block Area" unit="m²" value={cc.paverArea} onChange={(v) => setCC((p) => ({ ...p, paverArea: v }))} />
                      </Section>
                    )}

                    {/* ─── Storm Water ─── */}
                    {mod.id === "sw" && (
                      <>
                        <Section title="Drain Lengths">
                          <Num label="Main Drain" unit="m" value={sw.mainL} onChange={(v) => setSW((p) => ({ ...p, mainL: v }))} />
                          <Num label="Branch Drain" unit="m" value={sw.branchL} onChange={(v) => setSW((p) => ({ ...p, branchL: v }))} />
                        </Section>
                        <Section title="Drain Section">
                          <Num label="Internal Width" unit="m" value={sw.drainW} onChange={(v) => setSW((p) => ({ ...p, drainW: v }))} />
                          <Num label="Internal Height" unit="m" value={sw.drainH} onChange={(v) => setSW((p) => ({ ...p, drainH: v }))} />
                          <Num label="Wall Thickness" unit="m" value={sw.drainThick} onChange={(v) => setSW((p) => ({ ...p, drainThick: v }))} />
                        </Section>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Project Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Details</div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Project Name *</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inp} placeholder="e.g. Construction of New Bus Depot at Bareja" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">SOR Year</label>
                <select value={sorYear} onChange={(e) => setSorYear(e.target.value)} className={inp}>
                  {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Division</label>
                <select value={sorDivision} onChange={(e) => setSorDivision(e.target.value)} className={inp}>
                  <option value="">— Not set —</option>
                  {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating || !projectName.trim() || enabled.size === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
            {generating ? "Creating Project…" : <><Sparkles className="w-4 h-4" /> Generate Project & BOQ</>}
          </button>
        </div>

        {/* ─── Right: Live BOQ ─── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div>
                <div className="font-semibold text-slate-800 text-sm">Live BOQ — Abstract</div>
                <div className="text-xs text-slate-500">{allBOQ.length} items · auto-calculated</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Total</div>
                <div className="font-bold text-blue-700 text-base">{fmtRs(totalRs)}</div>
              </div>
            </div>

            {allBOQ.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">Enable at least one building module</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-semibold w-6">#</th>
                      <th className="text-left px-3 py-2 font-semibold w-14">Code</th>
                      <th className="text-left px-3 py-2 font-semibold">Description</th>
                      <th className="text-right px-3 py-2 font-semibold w-20">Qty</th>
                      <th className="text-center px-3 py-2 font-semibold w-12">Unit</th>
                      <th className="text-right px-3 py-2 font-semibold w-18">Rate</th>
                      <th className="text-right px-3 py-2 font-semibold w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      let lastMod = "";
                      allBOQ.forEach((r, idx) => {
                        if (r.module !== lastMod) {
                          lastMod = r.module;
                          rows.push(
                            <tr key={`mod-${r.module}`} className="bg-slate-100 border-t-2 border-slate-300">
                              <td colSpan={7} className="px-3 py-1.5 font-bold text-slate-700 text-xs uppercase tracking-wide">
                                {MODULES.find((m) => m.name === r.module)?.icon || "🏗️"} {r.module}
                              </td>
                            </tr>
                          );
                        }
                        const amount = r.qty * r.rate;
                        rows.push(
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/60">
                            <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-1.5 font-mono text-slate-500">{r.code}</td>
                            <td className="px-3 py-1.5 text-slate-700">{r.description}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-800">{fmt3(r.qty)}</td>
                            <td className="px-3 py-1.5 text-center text-slate-500">{r.unit}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{r.rate.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{Math.round(amount).toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* GSRTC Abstract Summary */}
          {allBOQ.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-800 text-white text-sm font-bold text-center tracking-wide">GSRTC — ABSTRACT SUMMARY</div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: "Total (All Works)", value: totalRs, cls: "" },
                    { label: "Add: 1% Welfare Cess", value: totals.wc, cls: "" },
                    { label: "Tender Amount", value: totals.tender, cls: "bg-slate-50 font-bold" },
                    { label: "Add: 18% GST", value: totals.gst, cls: "" },
                    { label: "Total with GST", value: totals.withGST, cls: "bg-slate-50 font-bold" },
                    { label: "Add: 5% Contingencies", value: totals.cont5, cls: "" },
                    { label: "Add: 2% Work Contingency", value: totals.cont2, cls: "" },
                    { label: "Estimated Amount", value: totals.estimated, cls: "bg-blue-50 font-bold" },
                    { label: "Say Estimated Amount", value: totals.say, cls: "bg-slate-800 text-white font-bold" },
                  ].map(({ label, value, cls }) => (
                    <tr key={label} className={`border-b border-slate-100 ${cls}`}>
                      <td className={`px-4 py-2 ${cls.includes("text-white") ? "text-white" : "text-slate-700"}`}>{label}</td>
                      <td className={`px-4 py-2 text-right font-mono ${cls.includes("text-white") ? "text-white text-base" : "text-slate-800"}`}>{fmtRs(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
