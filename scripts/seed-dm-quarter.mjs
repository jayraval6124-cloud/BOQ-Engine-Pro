/**
 * Proper Depo Manager Quarters wizard template
 * Based on Bardoli DM Quarter Final BOQ Excel (66 items, GSRTC codes)
 * node scripts/seed-dm-quarter.mjs
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ─── Parameters ────────────────────────────────────────────────────────────
// Foundation parameters drive computed quantities.
// Superstructure & finishing: direct volume/area/count inputs.

const PARAMS = [
  // ── Building footprint ──────────────────────────────────────────────────
  { name: "plinth_l",       label: "Plinth Length",                  unit: "m",   dims: "l" },
  { name: "plinth_b",       label: "Plinth Width",                   unit: "m",   dims: "l" },

  // ── Footing F1 ──────────────────────────────────────────────────────────
  { name: "f1_nos",         label: "F1 Footing — Count",             unit: "nos", dims: "n" },
  { name: "f1_exc_l",      label: "F1 Excavation Length",           unit: "m",   dims: "l" },
  { name: "f1_exc_b",      label: "F1 Excavation Width",            unit: "m",   dims: "l" },
  { name: "f1_exc_h",      label: "F1 Excavation Depth (0-1.5m)",   unit: "m",   dims: "l" },
  { name: "f1_exc_h2",     label: "F1 Extra Depth (1.5-3m)",        unit: "m",   dims: "l" },
  { name: "f1_rcc_l",      label: "F1 RCC Footing Length",          unit: "m",   dims: "l" },
  { name: "f1_rcc_b",      label: "F1 RCC Footing Width",           unit: "m",   dims: "l" },
  { name: "f1_rcc_h",      label: "F1 RCC Footing Height",          unit: "m",   dims: "l" },
  { name: "f1_pcc_h",      label: "F1 PCC Bed Thickness",           unit: "m",   dims: "l" },

  // ── Footing F2 ──────────────────────────────────────────────────────────
  { name: "f2_nos",         label: "F2 Footing — Count",             unit: "nos", dims: "n" },
  { name: "f2_exc_l",      label: "F2 Excavation Length",           unit: "m",   dims: "l" },
  { name: "f2_exc_b",      label: "F2 Excavation Width",            unit: "m",   dims: "l" },
  { name: "f2_exc_h",      label: "F2 Excavation Depth (0-1.5m)",   unit: "m",   dims: "l" },
  { name: "f2_exc_h2",     label: "F2 Extra Depth (1.5-3m)",        unit: "m",   dims: "l" },
  { name: "f2_rcc_l",      label: "F2 RCC Footing Length",          unit: "m",   dims: "l" },
  { name: "f2_rcc_b",      label: "F2 RCC Footing Width",           unit: "m",   dims: "l" },
  { name: "f2_rcc_h",      label: "F2 RCC Footing Height",          unit: "m",   dims: "l" },

  // ── Footing F3 ──────────────────────────────────────────────────────────
  { name: "f3_nos",         label: "F3 Footing — Count",             unit: "nos", dims: "n" },
  { name: "f3_exc_l",      label: "F3 Excavation Length",           unit: "m",   dims: "l" },
  { name: "f3_exc_b",      label: "F3 Excavation Width",            unit: "m",   dims: "l" },
  { name: "f3_exc_h",      label: "F3 Excavation Depth (0-1.5m)",   unit: "m",   dims: "l" },
  { name: "f3_exc_h2",     label: "F3 Extra Depth (1.5-3m)",        unit: "m",   dims: "l" },
  { name: "f3_rcc_l",      label: "F3 RCC Footing Length",          unit: "m",   dims: "l" },
  { name: "f3_rcc_b",      label: "F3 RCC Footing Width",           unit: "m",   dims: "l" },
  { name: "f3_rcc_h",      label: "F3 RCC Footing Height",          unit: "m",   dims: "l" },

  // ── Ground beam excavation extra (not covered by footing pits) ────────
  { name: "grd_bm_exc",     label: "Ground Beam Trench Excavation",  unit: "Cum", dims: "l" },

  // ── Superstructure — direct volume input (from structural drawings) ─────
  { name: "col_pl_cum",     label: "RCC Column upto Plinth (vol)",   unit: "Cum", dims: "l" },
  { name: "grd_bm_cum",     label: "RCC Ground Beam (vol)",          unit: "Cum", dims: "l" },
  { name: "col_gf_cum",     label: "RCC Column upto GF (vol)",       unit: "Cum", dims: "l" },
  { name: "col_ff_cum",     label: "RCC Column upto FF (vol)",       unit: "Cum", dims: "l" },
  { name: "lintel_cum",     label: "RCC Lintel GF (vol)",            unit: "Cum", dims: "l" },
  { name: "wshed_cum",      label: "RCC Weather Shed GF (vol)",      unit: "Cum", dims: "l" },
  { name: "gf_slab_cum",    label: "RCC GF Slab (vol)",              unit: "Cum", dims: "l" },
  { name: "gf_beam_cum",    label: "RCC GF Beam (vol)",              unit: "Cum", dims: "l" },
  { name: "stair_cum",      label: "RCC Staircase (vol)",            unit: "Cum", dims: "l" },

  // ── Steel ────────────────────────────────────────────────────────────────
  { name: "steel_kg",       label: "TMT Fe500D Reinforcement (DM)",  unit: "Kg",  dims: "l" },

  // ── Masonry ──────────────────────────────────────────────────────────────
  { name: "bw_fp_cum",      label: "Brickwork Foundation & Plinth",  unit: "Cum", dims: "l" },
  { name: "bw_gf_cum",      label: "Brickwork Ground Floor",         unit: "Cum", dims: "l" },
  { name: "partition_sqm",  label: "Partition Wall (115mm)",         unit: "Sqm", dims: "l" },

  // ── Plaster & Paint ───────────────────────────────────────────────────────
  { name: "ceil_plaster",   label: "Ceiling Plaster 10mm (Sqm)",     unit: "Sqm", dims: "l" },
  { name: "int_plaster",    label: "Internal Wall Plaster (Sqm)",    unit: "Sqm", dims: "l" },
  { name: "mala_texture",   label: "Mala + Texture Plaster (Sqm)",   unit: "Sqm", dims: "l" },
  { name: "putty_area",     label: "Putty + Primer Area (Sqm)",      unit: "Sqm", dims: "l" },
  { name: "distemper_area", label: "Oil Bound Distemper (Sqm)",      unit: "Sqm", dims: "l" },

  // ── Flooring ──────────────────────────────────────────────────────────────
  { name: "vit_floor",      label: "Vitrified Floor Tiles 24×24 (Sqm)",unit: "Sqm", dims: "l" },
  { name: "vit_skirting",   label: "Vitrified Skirting (Sqm)",       unit: "Sqm", dims: "l" },
  { name: "ceramic_floor",  label: "Ceramic Floor Tiles — Bathroom", unit: "Sqm", dims: "l" },
  { name: "ceramic_dado",   label: "Ceramic Wall Tiles — Dado",      unit: "Sqm", dims: "l" },

  // ── Woodwork / Stonework ──────────────────────────────────────────────────
  { name: "granite_counter",label: "Granite Counter/Platform (Sqm)", unit: "Sqm", dims: "l" },
  { name: "kitchen_cabinet",label: "Kitchen Cabinet Ply (Sqm)",      unit: "Sqm", dims: "l" },
  { name: "kota_stone",     label: "Kota Stone Slab 30mm (Sqm)",     unit: "Sqm", dims: "l" },
  { name: "cupboard_sqm",   label: "Cupboard (BWR Ply) (Sqm)",       unit: "Sqm", dims: "l" },

  // ── Doors ────────────────────────────────────────────────────────────────
  { name: "flush_door_sqm", label: "Flush Door Solid Core + Frame (Sqm)",unit: "Sqm", dims: "l" },
  { name: "frp_door_sqm",   label: "FRP Door Shutter + Frame (Sqm)", unit: "Sqm", dims: "l" },

  // ── Windows ──────────────────────────────────────────────────────────────
  { name: "al_window_sqm",  label: "Aluminium Sliding Window (Sqm)", unit: "Sqm", dims: "l" },
  { name: "al_vent_sqm",    label: "Aluminium Ventilator (Sqm)",     unit: "Sqm", dims: "l" },

  // ── Waterproofing ─────────────────────────────────────────────────────────
  { name: "terrace_wp",     label: "China Mosaic WP on Terrace (Sqm)",unit: "Sqm", dims: "l" },

  // ── Sanitary fixtures ─────────────────────────────────────────────────────
  { name: "kitchen_sink",   label: "Kitchen Sink (nos)",             unit: "nos", dims: "n" },
  { name: "wc_euro_nos",    label: "European WC Pan (nos)",          unit: "nos", dims: "n" },
  { name: "washbasin_nos",  label: "Wash Basin (nos)",               unit: "nos", dims: "n" },
  { name: "gully_trap_nos", label: "Gully Trap 150×100mm (nos)",     unit: "nos", dims: "n" },
  { name: "water_tank_ltr", label: "PVC Water Tank (Litres)",        unit: "Ltr", dims: "n" },
  { name: "nahni_nos",      label: "Nahni Trap 100mm (nos)",         unit: "nos", dims: "n" },

  // ── Plumbing ─────────────────────────────────────────────────────────────
  { name: "upvc_15mm",      label: "UPVC Pipe 15mm (Rmt)",           unit: "Rmt", dims: "l" },
  { name: "upvc_25mm",      label: "UPVC Pipe 25mm (Rmt)",           unit: "Rmt", dims: "l" },
  { name: "upvc_50mm",      label: "UPVC Pipe 50mm (Rmt)",           unit: "Rmt", dims: "l" },
  { name: "hdpe_110mm",     label: "HDPE/UPVC Pipe 110mm (Rmt)",     unit: "Rmt", dims: "l" },
  { name: "bib_tap_nos",    label: "Bib Taps 15mm (nos)",            unit: "nos", dims: "n" },
  { name: "shower_nos",     label: "CP Shower Rose (nos)",           unit: "nos", dims: "n" },
  { name: "mirror_nos",     label: "Mirror 600×450mm (nos)",         unit: "nos", dims: "n" },
  { name: "towel_rail_nos", label: "CP Towel Rail 600mm (nos)",      unit: "nos", dims: "n" },

  // ── External ─────────────────────────────────────────────────────────────
  { name: "brick_chamber",  label: "Brick Inspection Chamber (nos)", unit: "nos", dims: "n" },
  { name: "manhole_nos",    label: "Manhole 900×1200mm (nos)",       unit: "nos", dims: "n" },
  { name: "termite_sqm",    label: "Termite Treatment (Sqm)",        unit: "Sqm", dims: "l" },
  { name: "granite_riser",  label: "Granite Risers / Dedo (Sqm)",    unit: "Sqm", dims: "l" },
  { name: "ms_steel_kg",    label: "MS Steel Fabricated Work (Kg)",  unit: "Kg",  dims: "l" },
  { name: "ss_railing_rm",  label: "SS Pipe Railing (Rmt)",          unit: "Rmt", dims: "l" },
  { name: "paver_block",    label: "Interlocking Paver Blocks (Sqm)",unit: "Sqm", dims: "l" },
  { name: "garden_soil",    label: "River Sand / Garden Kamp (Cum)", unit: "Cum", dims: "l" },
  { name: "garden_sqm",     label: "Garden Lawn Development (Sqm)",  unit: "Sqm", dims: "l" },
  { name: "vermi_nos",      label: "Vermi Compost Bags 50kg (nos)",  unit: "nos", dims: "n" },
  { name: "soak_well_nos",  label: "Soak Well 2.5m dia × 6m deep",  unit: "nos", dims: "n" },
  { name: "ug_tank_ltr",    label: "Underground Water Tank (Litres)","unit": "Ltr", dims: "n" },
];

// ─── BOQ Items — all 66 from Bardoli Excel ─────────────────────────────────
// Formula: computed from the parameters above.
// For foundation items: formula computes from footing dimensions.
// For superstructure/finishing: formula = direct parameter value.
// Rate from Bardoli Excel (2026-27 SOR Surat Division).

const BOQ = [
  // 1. Excavation 0–1.5m — footings + ground beams
  {
    sorCode: "RJ013",
    description: "Excavation for foundation in any kind of soil incl. sand, murrum, dewatering, shoring, back filling etc. (A) 0.00 to 1.50 m",
    unit: "Cum",
    rate: 316.82,
    formula: `(f1_nos * f1_exc_l * f1_exc_b * f1_exc_h) +
              (f2_nos * f2_exc_l * f2_exc_b * f2_exc_h) +
              (f3_nos * f3_exc_l * f3_exc_b * f3_exc_h) +
              (plinth_l * plinth_b * 0.10) + grd_bm_exc`,
  },
  // 2. Excavation 1.5–3m
  {
    sorCode: "RJ014",
    description: "Excavation for foundation in any kind of soil etc. comp. (B) 1.50 to 3.00 m",
    unit: "Cum",
    rate: 332.26,
    formula: `(f1_nos * f1_exc_l * f1_exc_b * f1_exc_h2) +
              (f2_nos * f2_exc_l * f2_exc_b * f2_exc_h2) +
              (f3_nos * f3_exc_l * f3_exc_b * f3_exc_h2)`,
  },
  // 3. Earth filling plinth
  {
    sorCode: "RJ017",
    description: "Filling in foundation and plinth with murrum or selected soil in layers of 20cm thick incl. watering, ramming etc. complete",
    unit: "Cum",
    rate: 298.79,
    formula: "plinth_l * plinth_b * 0.60",
  },
  // 4. PCC 1:3:6 Foundation
  {
    sorCode: "RJ027",
    description: "Providing and laying cement concrete 1:3:6 (1-Cement: 3-Coarse sand: 6-Stone aggregate 40mm) curing complete excl. formwork. (A) Foundation, plinth and any place",
    unit: "Cum",
    rate: 3064.60,
    formula: `(f1_nos * f1_rcc_l * f1_rcc_b * f1_pcc_h) +
              (f2_nos * f2_rcc_l * f2_rcc_b * f1_pcc_h) +
              (f3_nos * f3_rcc_l * f3_rcc_b * f1_pcc_h) +
              (plinth_l * plinth_b * 0.10)`,
  },
  // 5. RCC M250 Foundation & Plinth
  {
    sorCode: "RJ030",
    description: "Providing & laying cement concrete M-250 for RCC work — machine mixed, vibrated, cured, incl. formwork etc. complete. (A) Foundation & Plinth",
    unit: "Cum",
    rate: 4494,
    formula: `(f1_nos * f1_rcc_l * f1_rcc_b * f1_rcc_h) +
              (f2_nos * f2_rcc_l * f2_rcc_b * f2_rcc_h) +
              (f3_nos * f3_rcc_l * f3_rcc_b * f3_rcc_h) +
              (plinth_l * plinth_b * 0.15)`,
  },
  // 6. RCC Column upto Plinth
  {
    sorCode: "RJ032",
    description: "RCC M-250 Column upto Plinth level incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 7131,
    formula: "col_pl_cum",
  },
  // 7. RCC Ground Beam
  {
    sorCode: "RJ031",
    description: "RCC M-250 Ground Beam incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 5572,
    formula: "grd_bm_cum",
  },
  // 8. RCC Column upto GF
  {
    sorCode: "RJ033",
    description: "RCC M-250 Column upto Ground Floor level incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 7131,
    formula: "col_gf_cum",
  },
  // 9. RCC Column upto FF
  {
    sorCode: "RJ034",
    description: "RCC M-250 Column upto First Floor level incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 7172,
    formula: "col_ff_cum",
  },
  // 10. RCC Lintel GF
  {
    sorCode: "RJ044",
    description: "RCC M-250 Ground Floor Lintel incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 5988,
    formula: "lintel_cum",
  },
  // 11. RCC Weather Shed GF
  {
    sorCode: "RJ047",
    description: "RCC M-250 Ground Floor Weather Shed / Chajja incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 6595,
    formula: "wshed_cum",
  },
  // 12. RCC GF Slab
  {
    sorCode: "RJ040",
    description: "RCC M-250 Ground Floor Slab incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 6009,
    formula: "gf_slab_cum",
  },
  // 13. RCC GF Beam
  {
    sorCode: "RJ036",
    description: "RCC M-250 Ground Floor Beam incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 5913,
    formula: "gf_beam_cum",
  },
  // 14. RCC Staircase
  {
    sorCode: "RJ054",
    description: "RCC M-250 Ground Floor Staircase (waist slab + steps) incl. centering, curing, formwork etc. complete",
    unit: "Cum",
    rate: 6198,
    formula: "stair_cum",
  },
  // 15. TMT Fe500D Reinforcement (DM Quarter only)
  {
    sorCode: "RJ080",
    description: "Providing TMT Bar Fe 500D reinforcement for RCC work incl. bending, binding and placing in position complete",
    unit: "Kg",
    rate: 76.52,
    formula: "steel_kg",
  },
  // 16. Brickwork Foundation & Plinth
  {
    sorCode: "RJ084",
    description: "Brick masonry using common burnt clay bricks (≥35 kg/sqcm) in CM 1:6 incl. watering, curing, scaffolding etc. complete. (A) Foundation & Plinth",
    unit: "Cum",
    rate: 4172.60,
    formula: "bw_fp_cum",
  },
  // 17. Brickwork GF
  {
    sorCode: "RJ085",
    description: "Brick masonry using common burnt clay bricks (≥35 kg/sqcm) in CM 1:6 incl. watering, curing, scaffolding etc. complete. (B) Ground Floor",
    unit: "Cum",
    rate: 4458.46,
    formula: "bw_gf_cum",
  },
  // 18. Partition Wall (half-brick)
  {
    sorCode: "RJ089",
    description: "Providing & laying 1st class burnt brick masonry partition wall in CM 1:4 incl. 6mm MS bars at bottom & every 37.5cm height, scaffolding, curing etc. complete. (B) Ground Floor",
    unit: "Sqm",
    rate: 679.04,
    formula: "partition_sqm",
  },
  // 19. Ceiling plaster 10mm
  {
    sorCode: "RJ103",
    description: "10mm thick cement plaster single coat on brick/concrete ceiling/soffit in CM 1:3, finished even and smooth incl. floating coat of neat cement slurry etc. complete. (A) Ground Floor",
    unit: "Sqm",
    rate: 197.76,
    formula: "ceil_plaster",
  },
  // 20. Internal wall plaster 15mm
  {
    sorCode: "RJ109",
    description: "15mm thick cement plaster single coat on internal walls in CM 1:3, finished even and smooth incl. floating coat of neat cement slurry etc. complete. (A) Ground Floor",
    unit: "Sqm",
    rate: 246.92,
    formula: "int_plaster",
  },
  // 21. Mala + Texture plaster (external DM walls)
  {
    sorCode: "RJ247",
    description: "20mm double coat mala cement plaster on interior/exterior brick/concrete work: 12mm base coat CM 1:4 + 8mm top coat CM 1:2 + 3mm Texture Plaster (Spectrum/Coral or equivalent) incl. grooves, scaffolding, curing etc. complete",
    unit: "Sqm",
    rate: 850,
    formula: "mala_texture",
  },
  // 22. Putty + Primer
  {
    sorCode: "RJ153",
    description: "Applying two coats of putty & two coats of primer of approved brand on new wall surface, sand papered smooth etc. complete",
    unit: "Sqm",
    rate: 40.19,
    formula: "putty_area",
  },
  // 23. Oil Bound Distemper
  {
    sorCode: "RJ274",
    description: "Distempering (two coats) with oil bound distemper of approved brand over priming coat on wall surfaces to give even shade etc. complete",
    unit: "Sqm",
    rate: 75.09,
    formula: "distemper_area",
  },
  // 24. Vitrified floor tiles 24×24
  {
    sorCode: "RJ134",
    description: "Providing & laying 24\"×24\" vitrified 8mm thick floor tiles over 20mm (avg) CM 1:6 base, jointed with colour cement slurry, flush pointing, cleaning etc. complete. Light shade. (A) Flooring",
    unit: "Sqm",
    rate: 1081.55,
    formula: "vit_floor",
  },
  // 25. Vitrified skirting
  {
    sorCode: "RJ135",
    description: "Providing & laying 24\"×24\" vitrified 8mm thick tile skirting over 20mm CM 1:6 base, jointed with colour cement slurry etc. complete. Light shade. (B) Skirting/Dado",
    unit: "Sqm",
    rate: 1131.55,
    formula: "vit_skirting",
  },
  // 26. Ceramic floor tiles (bathroom)
  {
    sorCode: "RJ132",
    description: "Supplying & fixing heavy duty ceramic tiles 6-7mm in CM 1:3 bedding 12mm avg, jointed with colour cement slurry at Sanitary Blocks etc. complete. (A) Flooring",
    unit: "Sqm",
    rate: 950.91,
    formula: "ceramic_floor",
  },
  // 27. Ceramic wall tiles (dado/bathroom)
  {
    sorCode: "RJ133",
    description: "Supplying & fixing heavy duty ceramic tiles 6-7mm in CM 1:3 bedding 12mm avg, jointed with colour cement slurry at Sanitary Blocks etc. complete. (B) Skirting/Dado",
    unit: "Sqm",
    rate: 1026.98,
    formula: "ceramic_dado",
  },
  // 28. Granite counter / kitchen platform
  {
    sorCode: "RJ139",
    description: "Providing & constructing granite top sandwich type kitchen platform 1.2m height × 90cm wide with polished Kota stone support, 18mm black granite top with quarter round moulding, mirror polished etc. complete as directed",
    unit: "Sqm",
    rate: 3000,
    formula: "granite_counter",
  },
  // 29. Kitchen cabinet (waterproof plywood)
  {
    sorCode: "RJ280",
    description: "Providing & fixing 19mm waterproof plywood shutters for kitchen cabinet with 1mm laminate both sides, SS fixtures (handle, aldrop, tower bolt, magnet, lock), drawers etc. complete",
    unit: "Sqm",
    rate: 3500,
    formula: "kitchen_cabinet",
  },
  // 30. Kota stone slab 30mm
  {
    sorCode: "RJ136",
    description: "Providing & fixing double-side polished Kota stone slab flooring over 20mm CM 1:6 base, jointed with grey cement slurry, rubbing, polishing, rounding outer edge etc. complete. [A] 30mm",
    unit: "Sqm",
    rate: 1342,
    formula: "kota_stone",
  },
  // 31. Cupboard (BWR plywood)
  {
    sorCode: "RJ279",
    description: "Providing & fixing Cupboard (1.80×0.45×1.20 D×H) — 18mm BWR plywood with 1mm laminate exterior, 0.6mm interior laminate, post forming doors, SS legs, auto hinges (HAFELE), multiple drawer lock, telescopic channel etc. complete",
    unit: "Sqm",
    rate: 14500,
    formula: "cupboard_sqm",
  },
  // 32. Flush door
  {
    sorCode: "RJ122",
    description: "Providing & fixing 35mm flush door solid double core, both face waterproof ply veneered & 1.5mm laminate pasted on both sides, Sal wood frame 12cm×7cm, SS hinges, anodized aluminium fixtures etc. complete",
    unit: "Sqm",
    rate: 3500,
    formula: "flush_door_sqm",
  },
  // 33. FRP door
  {
    sorCode: "RJ123",
    description: "Providing & fixing FRP frame 100×50mm and 28mm thick FRP depressed panel shutter with polyurethane foam core, SS hinges, aluminium fixtures — waterproof, weatherproof, termite proof etc. complete",
    unit: "Sqm",
    rate: 2354.22,
    formula: "frp_door_sqm",
  },
  // 34. Aluminium window
  {
    sorCode: "RJ117",
    description: "Providing & fixing aluminium colour anodized two-track sliding window (Jindal/Hindalco sections) with 5mm tinted float glass, CP fittings, silicon sealant, MS safety grill with one coat anti-corrosive + two coats oil paint etc. complete",
    unit: "Sqm",
    rate: 3500,
    formula: "al_window_sqm",
  },
  // 35. Aluminium ventilator
  {
    sorCode: "RJ119",
    description: "Providing & fixing standard extruded aluminium section frame 63×38.10×1.2mm colour anodized with 5mm frosted glass for ventilation etc. complete",
    unit: "Sqm",
    rate: 1163.92,
    formula: "al_vent_sqm",
  },
  // 36. China Mosaic WP on terrace
  {
    sorCode: "RJ144",
    description: "Providing & laying China Mosaic waterproofing on terrace: cement slurry with WP compound + 50mm CC 1:2:4 with WP compound + second coat slurry + 20mm CM 1:4 + China mosaic tiles, flooded for 2 weeks etc. complete",
    unit: "Sqm",
    rate: 850,
    formula: "terrace_wp",
  },
  // 37. Kitchen sink
  {
    sorCode: "RJ281",
    description: "Providing & fixing kitchen sink with CI/MS brackets painted white, cutting holes in walls, making good — (C) Vitreous China Sink 600×450×150mm",
    unit: "Nos",
    rate: 2303.62,
    formula: "kitchen_sink",
  },
  // 38. European WC pan
  {
    sorCode: "RJ190",
    description: "Providing & fixing European type wash down WC pan (white glazed stoneware, Perry or equivalent) with P/S trap, 12.5L low-level flush cistern with all fittings, plastic seat & cover, CP brass connections etc. complete",
    unit: "Nos",
    rate: 4024.73,
    formula: "wc_euro_nos",
  },
  // 39. Wash basin
  {
    sorCode: "RJ193",
    description: "Providing & fixing flat back wash basin (Cera/Hindware, 550×400mm) with single hole for pillar tap, CI/MS brackets, CP brass waste, MI Fisher union 32mm, 15mm pillar tap, stop tap, PVC waste pipe etc. complete",
    unit: "Nos",
    rate: 2189.79,
    formula: "washbasin_nos",
  },
  // 40. Gully trap
  {
    sorCode: "RJ230",
    description: "Providing & fixing gully trap 150×100mm glazed stoneware with CI circular cover and chamber, brick masonry in CM 1:6, CP in CM 1:3, curing etc. complete",
    unit: "Nos",
    rate: 1234.57,
    formula: "gully_trap_nos",
  },
  // 41. PVC water tank
  {
    sorCode: "RJ216",
    description: "Supplying, erecting & fixing PVC milky cylindrical vertical water storage tank (HDPE, moulded in one piece) with platform, top lid, locking ring, ball valve, inlet/outlet/overflow/washout connections etc. complete",
    unit: "Ltr",
    rate: 7.60,
    formula: "water_tank_ltr",
  },
  // 42. Nahni trap
  {
    sorCode: "RJ194",
    description: "Providing & fixing precast Nahni trap 455×610mm, self-cleaning design, 100mm inlet & outlet, CI grating incl. cutting and making good walls and floor etc. complete",
    unit: "Nos",
    rate: 593.70,
    formula: "nahni_nos",
  },
  // 43. UPVC pipe 15mm
  {
    sorCode: "RJ199",
    description: "Providing, laying & jointing UPVC pipe SCH-40 (Prince/Supreme/Astral/Finolex) fixed with clamps at 2m c/c or concealed, incl. necessary fittings, testing etc. complete. (A) 15mm dia",
    unit: "Rmt",
    rate: 71.93,
    formula: "upvc_15mm",
  },
  // 44. UPVC pipe 25mm
  {
    sorCode: "RJ201",
    description: "Providing, laying & jointing UPVC pipe SCH-40 (Prince/Supreme/Astral/Finolex) fixed with clamps at 2m c/c or concealed, incl. necessary fittings, testing etc. complete. (C) 25mm dia",
    unit: "Rmt",
    rate: 90.93,
    formula: "upvc_25mm",
  },
  // 45. UPVC pipe 50mm
  {
    sorCode: "RJ204",
    description: "Providing, laying & jointing UPVC pipe SCH-40 (Prince/Supreme/Astral/Finolex) fixed with clamps at 2m c/c or concealed, incl. necessary fittings, testing etc. complete. (F) 50mm dia",
    unit: "Rmt",
    rate: 193.73,
    formula: "upvc_50mm",
  },
  // 46. HDPE pipe 110mm
  {
    sorCode: "RJ198",
    description: "Providing & fixing 10 kg/sqcm working pressure polythene pipe (low density) with compression fittings, wall clamping at ≤0.9m c/c, wooden plug board on wall etc. complete. (B) 110mm dia",
    unit: "Rmt",
    rate: 335.69,
    formula: "hdpe_110mm",
  },
  // 47. Bib tap 15mm
  {
    sorCode: "RJ206",
    description: "Providing & fixing screw down bib tap — Brass chromium plated, 15mm dia",
    unit: "Nos",
    rate: 184.98,
    formula: "bib_tap_nos",
  },
  // 48. CP shower rose
  {
    sorCode: "RJ220",
    description: "Supplying & fixing 15mm × 13cm dia CP shower rose with nozzle & 15mm dia brass stop cock etc. complete",
    unit: "Nos",
    rate: 279.37,
    formula: "shower_nos",
  },
  // 49. Mirror
  {
    sorCode: "RJ195",
    description: "Providing & fixing 600×450mm bevelled edge mirror mounted on 6mm AC sheet/plywood, fixed with CP brass screws and washers etc. complete",
    unit: "Nos",
    rate: 850.90,
    formula: "mirror_nos",
  },
  // 50. Towel rail
  {
    sorCode: "RJ196",
    description: "Providing & fixing CP brass towel rail complete with CP brass brackets fixed to wooden plugs with CP brass screws. (B) 600mm × 20mm size",
    unit: "Nos",
    rate: 610.32,
    formula: "towel_rail_nos",
  },
  // 51. Brick inspection chamber
  {
    sorCode: "RJ231",
    description: "Constructing brick masonry chamber for underground CI inspection chamber in CM 1:5, CI cover with frame 445×610mm (≥38 kg), RCC top slab 1:2:4, foundation concrete 1:5:10, inside plaster 15mm CM 1:3 etc. complete. (iii) Inside 600×850mm, 450mm deep, 3+ inlets",
    unit: "Each",
    rate: 7109.35,
    formula: "brick_chamber",
  },
  // 52. Manhole 900×1200mm
  {
    sorCode: "RJ232",
    description: "Constructing manhole with RCC top slab 1:2:4, foundation concrete 1:3:6 brickbat, inside plaster 15mm CM 1:5, channels in CC 1:2:4 — inside 900×1200mm, 1.5m deep, CI cover with frame 560mm dia (≥128 kg), 230mm brick walls in CM 1:5. (A) 150mm sewer",
    unit: "Each",
    rate: 10933.41,
    formula: "manhole_nos",
  },
  // 53. Termite treatment
  {
    sorCode: "RJ161",
    description: "Carrying out plinth treatment (post construction) by spraying chemical solution for termite control incl. labour, material as per ISI specification (Chlordene/Chlorpyrifos 20 EC, 1% concentration, 5 L chemical/sqm) etc. complete",
    unit: "Sqm",
    rate: 86.17,
    formula: "termite_sqm",
  },
  // 54. Granite risers / dado
  {
    sorCode: "RJ140",
    description: "Providing & laying 18mm granite on risers of steps/dado, landing & jamb seal over 10mm CM 1:4 bed, flush pointing, rounding outer edge, moulding, polishing etc. complete",
    unit: "Sqm",
    rate: 2210,
    formula: "granite_riser",
  },
  // 55. MS steel fabricated work
  {
    sorCode: "RJ127",
    description: "Supplying, fabricating & erecting MS steel for trusses, rafters, purlins, bolts, gusset plates, brackets etc. as per drawing, incl. cutting, bending, welding, one coat anti-corrosive + two coats aluminium/oil paint etc. complete",
    unit: "Kg",
    rate: 130.52,
    formula: "ms_steel_kg",
  },
  // 56. SS pipe railing
  {
    sorCode: "RJ130",
    description: "Providing & fixing SS pipe railing 50mm dia ≥18 gauge in 3 rows, SS pipe supports at corners & 1.5m c/c, concrete block 0.35×0.35×0.35m, 16 gauge SS sheet, cutting, jointing, welding, threading etc. complete",
    unit: "Rmt",
    rate: 2456,
    formula: "ss_railing_rm",
  },
  // 57. Interlocking paver blocks
  {
    sorCode: "RJ141",
    description: "Providing & laying precast rubber/steel die interlocking concrete paver blocks 60mm thick (M300, pneumatic/mechanical) as per IS 15658:2006, on 35mm sand layer, joints filled with sand, in line and level as per IRC:SP 63-2018 etc. complete",
    unit: "Sqm",
    rate: 699.93,
    formula: "paver_block",
  },
  // 58. River sand / kamp for garden
  {
    sorCode: "RJ282",
    description: "Supplying, stacking & spreading river kamp (approved quality, outside source) in garden premises at required thickness incl. watering and levelling etc. complete",
    unit: "Cum",
    rate: 650,
    formula: "garden_soil",
  },
  // 59. Garden lawn development
  {
    sorCode: "RJ283",
    description: "Developing garden with green lawn — levelling ground with good quality soil & river sand, adding fertilizer, preparing soft ground, planting lawn roots at required spacing as per level/slope excl. vermi compost, incl. cost of green lawn etc. complete",
    unit: "Sqm",
    rate: 125,
    formula: "garden_sqm",
  },
  // 60. Vermi compost
  {
    sorCode: "RJ284",
    description: "Supplying vermi compost fertilizer for garden in bags of 50 kg weight at site etc. complete",
    unit: "Each",
    rate: 340,
    formula: "vermi_nos",
  },
  // 61. Soak well
  {
    sorCode: "RJ248",
    description: "Constructing soak well 2.5m inside dia × 6.00m deep, excavation in any soil, 0.23m honeycomb brick masonry wall in CM 1:6 from 2.5m bottom + 0.30m solid top, 0.10m CC 1:4:8 base, RCC top slab 0.12m in CC 1:2:4 incl. formwork & reinforcement as directed",
    unit: "Each",
    rate: 95000,
    formula: "soak_well_nos",
  },
  // 62. Underground water tank
  {
    sorCode: "RJ250",
    description: "Providing & laying OC 1:1.5:3 RCC for underground tank incl. boxing, vibrating, curing, water proofing compound (CEMWET/PIDICRETE LW), excavation & refilling, 15cm CC 1:4:8 bedding, half BM in CM 1:4 outside, RCC walls as per design, 10mm WP plaster CM 1:3 smooth inside incl. locking, inlet, outlet, overflow, CI cover 0.60×0.45m etc. complete excl. steel",
    unit: "Ltr",
    rate: 9,
    formula: "ug_tank_ltr",
  },
];

// ─── Bardoli default measurement presets ───────────────────────────────────
const PRESETS = {
  // Building footprint
  plinth_l: 10.5, plinth_b: 10.5,
  // F1 footing — 8 nos, exc 2.10×2.25×1.50m, RCC 1.50×1.65×0.45m
  f1_nos: 8, f1_exc_l: 2.10, f1_exc_b: 2.25, f1_exc_h: 1.50, f1_exc_h2: 0.30,
  f1_rcc_l: 1.50, f1_rcc_b: 1.65, f1_rcc_h: 0.45, f1_pcc_h: 0.15,
  // F2 footing — 2 nos, exc 2.10×2.40×1.50m, RCC 1.50×1.80×0.45m
  f2_nos: 2, f2_exc_l: 2.10, f2_exc_b: 2.40, f2_exc_h: 1.50, f2_exc_h2: 0.30,
  f2_rcc_l: 1.50, f2_rcc_b: 1.80, f2_rcc_h: 0.45,
  // F3 footing — 2 nos, exc 2.10×2.10×1.50m, RCC 1.50×1.50×0.30m
  f3_nos: 2, f3_exc_l: 2.10, f3_exc_b: 2.10, f3_exc_h: 1.50, f3_exc_h2: 0.30,
  f3_rcc_l: 1.50, f3_rcc_b: 1.50, f3_rcc_h: 0.30,
  // Superstructure volumes (from Bardoli MS)
  col_pl_cum: 7, grd_bm_cum: 9, col_gf_cum: 5, col_ff_cum: 3,
  lintel_cum: 2, wshed_cum: 2, gf_slab_cum: 16, gf_beam_cum: 13, stair_cum: 3,
  // Ground beam extra excavation (Bardoli: 103 - 96.08 = 6.92 ≈ 7)
  grd_bm_exc: 6.92,
  // Steel
  steel_kg: 9515,
  // Masonry
  bw_fp_cum: 12, bw_gf_cum: 37, partition_sqm: 10,
  // Plaster & paint
  ceil_plaster: 156, int_plaster: 352, mala_texture: 259,
  putty_area: 508, distemper_area: 508,
  // Flooring
  vit_floor: 77, vit_skirting: 9, ceramic_floor: 8, ceramic_dado: 71,
  // Woodwork / stone
  granite_counter: 3, kitchen_cabinet: 5, kota_stone: 5, cupboard_sqm: 4.32,
  // Doors
  flush_door_sqm: 13, frp_door_sqm: 6,
  // Windows
  al_window_sqm: 14, al_vent_sqm: 2,
  // WP
  terrace_wp: 154,
  // Sanitary
  kitchen_sink: 1, wc_euro_nos: 2, washbasin_nos: 2,
  gully_trap_nos: 4, water_tank_ltr: 1000, nahni_nos: 6,
  // Plumbing
  upvc_15mm: 45, upvc_25mm: 110, upvc_50mm: 50, hdpe_110mm: 15,
  bib_tap_nos: 8, shower_nos: 2, mirror_nos: 2, towel_rail_nos: 2,
  // External
  brick_chamber: 2, manhole_nos: 1, termite_sqm: 223,
  granite_riser: 46, ms_steel_kg: 229.5, ss_railing_rm: 15,
  paver_block: 97, garden_soil: 5, garden_sqm: 30, vermi_nos: 2,
  soak_well_nos: 1, ug_tank_ltr: 3000,
};

async function seed() {
  console.log("🏠 Seeding Depo Manager Quarters template (Bardoli 66 items)…");

  await p.wizardTemplate.update({
    where: { id: "cmst3u04x000038x9oub17vmn" },
    data: {
      name: "Depo Manager Quarters (G+1)",
      description: "Full 66-item GSRTC BOQ for G+1 DM Quarter — foundation (F1/F2/F3 isolated footings), RCC frame, masonry, finishing, plumbing, external works. Bardoli Surat Division defaults pre-loaded.",
      icon: "🏠",
      buildingType: "RESIDENTIAL",
      parameters: PARAMS,
      boqItemFormulas: BOQ,
      measurementPresets: PRESETS,
    },
  });

  console.log(`  ✓ DM Quarter — ${PARAMS.length} parameters, ${BOQ.length} BOQ items`);
  console.log("✅ Done!");
  await p.$disconnect();
}

seed().catch((e) => { console.error(e); p.$disconnect(); process.exit(1); });
