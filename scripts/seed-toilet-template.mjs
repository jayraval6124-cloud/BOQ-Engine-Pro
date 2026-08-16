/**
 * Proper Toilet Block wizard template — detailed parameters + full BOQ
 * node scripts/seed-toilet-template.mjs
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ─── Parameters ────────────────────────────────────────────────────────────
// dims: n=count, l=single length, b=single width, h=single height,
//       lxb=length×width, lxbxh, null=measurement table (multi-row)

const PARAMS = [
  // ── Building shell ──────────────────────────────────────────────────────
  { name: "block_l",            label: "Block Length (overall)",         unit: "m",   dims: "l"    },
  { name: "block_b",            label: "Block Width (overall)",          unit: "m",   dims: "l"    },
  { name: "wall_h",             label: "Wall Height",                    unit: "m",   dims: "l"    },
  { name: "parapet_h",          label: "Parapet Height",                 unit: "m",   dims: "l"    },

  // ── Foundation ──────────────────────────────────────────────────────────
  { name: "strip_ft_len",       label: "Strip Footing Length (total)",   unit: "m",   dims: "l"    },
  { name: "strip_ft_w",         label: "Strip Footing Width",            unit: "m",   dims: "l"    },
  { name: "strip_ft_h",         label: "Strip Footing Height",           unit: "m",   dims: "l"    },
  { name: "exc_depth",          label: "Excavation Depth",               unit: "m",   dims: "l"    },

  // ── Masonry ─────────────────────────────────────────────────────────────
  { name: "ext_wall_len",       label: "External Wall Length (perimeter)",unit: "m",  dims: "l"    },
  { name: "partition_len",      label: "WC Partition Wall Length (total)",unit: "m",  dims: "l"    },

  // ── Flooring areas ──────────────────────────────────────────────────────
  { name: "floor_area",         label: "Total Floor Area",               unit: "Sqm", dims: "lxb"  },
  { name: "wall_tile_area",     label: "Wall Tile Area (internal)",      unit: "Sqm", dims: null   },

  // ── Roof slab ───────────────────────────────────────────────────────────
  { name: "roof_l",             label: "Roof Slab Length",               unit: "m",   dims: "l"    },
  { name: "roof_b",             label: "Roof Slab Width",                unit: "m",   dims: "l"    },
  { name: "roof_thick",         label: "Roof Slab Thickness",            unit: "m",   dims: "l"    },

  // ── Doors ───────────────────────────────────────────────────────────────
  { name: "main_door_nos",      label: "Main Entry Doors",               unit: "nos", dims: "n"    },
  { name: "main_door_w",        label: "Main Door Width",                unit: "m",   dims: "l"    },
  { name: "main_door_h",        label: "Main Door Height",               unit: "m",   dims: "l"    },
  { name: "wc_door_nos",        label: "WC Cubicle Doors (PVC)",         unit: "nos", dims: "n"    },
  { name: "wc_door_w",          label: "WC Door Width",                  unit: "m",   dims: "l"    },
  { name: "wc_door_h",          label: "WC Door Height",                 unit: "m",   dims: "l"    },

  // ── Windows / ventilators ────────────────────────────────────────────────
  { name: "window_nos",         label: "Windows / Ventilators",          unit: "nos", dims: "n"    },
  { name: "window_w",           label: "Window Width",                   unit: "m",   dims: "l"    },
  { name: "window_h",           label: "Window Height",                  unit: "m",   dims: "l"    },

  // ── Sanitary fixtures ────────────────────────────────────────────────────
  { name: "indian_wc_nos",      label: "Indian WC Pans (Orissa/squatting)", unit: "nos", dims: "n" },
  { name: "euro_wc_nos",        label: "European WC (seat type)",        unit: "nos", dims: "n"    },
  { name: "urinal_nos",         label: "Wall-hung Urinals (stall/bowl)", unit: "nos", dims: "n"    },
  { name: "washbasin_nos",      label: "Wash Basins with CP fittings",   unit: "nos", dims: "n"    },
  { name: "disabled_wc_nos",    label: "Disabled / Accessible WC Pans",  unit: "nos", dims: "n"    },

  // ── Flushing / cisterns ─────────────────────────────────────────────────
  { name: "cistern_nos",        label: "Flushing Cisterns (9L, PVC)",    unit: "nos", dims: "n"    },
  { name: "flush_valve_nos",    label: "Flush Valves (UF type, for urinals)", unit: "nos", dims: "n" },

  // ── Plumbing – water supply ─────────────────────────────────────────────
  { name: "supply_25mm_rm",     label: "Water Supply CPVC 25mm (main)", unit: "m",   dims: "l"    },
  { name: "supply_15mm_rm",     label: "Water Supply CPVC 15mm (branches)",unit: "m", dims: "l"   },
  { name: "stop_cock_nos",      label: "Stop Cocks / Gate Valves",       unit: "nos", dims: "n"    },
  { name: "overhead_tank_cap",  label: "HDPE Overhead Tank Capacity",    unit: "L",   dims: "n"    },

  // ── Plumbing – drainage ─────────────────────────────────────────────────
  { name: "soil_pipe_110_rm",   label: "UPVC Soil Pipe 110mm (WC drain)",unit: "m",  dims: "l"    },
  { name: "waste_pipe_75_rm",   label: "UPVC Waste Pipe 75mm (basin/urinal)",unit:"m",dims: "l"   },
  { name: "floor_trap_nos",     label: "Nahani / Floor Traps (UPVC)",    unit: "nos", dims: "n"    },
  { name: "cleanout_nos",       label: "Cleanout / Access Points",       unit: "nos", dims: "n"    },
  { name: "gully_trap_nos",     label: "Gully Traps",                    unit: "nos", dims: "n"    },

  // ── External / site ─────────────────────────────────────────────────────
  { name: "manhole_nos",        label: "Manholes (brick, 600×450mm)",    unit: "nos", dims: "n"    },
  { name: "septic_tank_vol",    label: "Septic Tank Volume",             unit: "Cum", dims: "lxbxh"},
  { name: "soak_pit_nos",       label: "Soak Pits",                      unit: "nos", dims: "n"    },

  // ── Electrical ──────────────────────────────────────────────────────────
  { name: "exhaust_fan_nos",    label: "Exhaust Fans (300mm/350mm)",     unit: "nos", dims: "n"    },
  { name: "light_point_nos",    label: "Light / Fan Points",             unit: "nos", dims: "n"    },
];

// ─── BOQ formulas ──────────────────────────────────────────────────────────

const BOQ = [
  // ══ 1. EARTHWORK ═════════════════════════════════════════════════════════
  {
    sorCode: "RJ013",
    description: "Earthwork in excavation for strip foundation, depth exc_depth m",
    unit: "Cum",
    formula: "strip_ft_len * (strip_ft_w + 0.30) * exc_depth",
  },
  {
    sorCode: "RJ016",
    description: "Earth filling below floor slab (imported murum, compacted in layers)",
    unit: "Cum",
    formula: "floor_area * 0.30",
  },
  {
    sorCode: "RJ019",
    description: "Disposal of surplus excavated earth, lead 50m",
    unit: "Cum",
    formula: "strip_ft_len * (strip_ft_w + 0.30) * exc_depth * 0.40",
  },

  // ══ 2. PCC / LEAN CONCRETE ═══════════════════════════════════════════════
  {
    sorCode: "RJ038",
    description: "PCC M10 (1:3:6) 100mm thick below strip footing",
    unit: "Cum",
    formula: "strip_ft_len * (strip_ft_w + 0.10) * 0.10",
  },
  {
    sorCode: "RJ038",
    description: "PCC M15 (1:2:4) floor bed slab 100mm thick under tiles",
    unit: "Cum",
    formula: "floor_area * 0.10",
  },

  // ══ 3. STRIP FOOTING (RCC) ═══════════════════════════════════════════════
  {
    sorCode: "RJ042",
    description: "RCC M20 strip footing strip_ft_w m wide × strip_ft_h m deep",
    unit: "Cum",
    formula: "strip_ft_len * strip_ft_w * strip_ft_h",
  },
  {
    sorCode: "RJ048",
    description: "Steel reinforcement Fe500D for strip footing (8mm@200 c/c both ways)",
    unit: "MT",
    formula: "strip_ft_len * strip_ft_w * strip_ft_h * 2800 * 0.001",
  },

  // ══ 4. PLINTH BEAM ═══════════════════════════════════════════════════════
  {
    sorCode: "RJ042",
    description: "RCC M20 plinth beam 230×300mm",
    unit: "Cum",
    formula: "ext_wall_len * 0.23 * 0.30",
  },
  {
    sorCode: "RJ048",
    description: "Steel reinforcement Fe500D for plinth beam",
    unit: "MT",
    formula: "ext_wall_len * 0.23 * 0.30 * 3000 * 0.001",
  },

  // ══ 5. ROOF SLAB ═════════════════════════════════════════════════════════
  {
    sorCode: "RJ042",
    description: "RCC M20 roof slab roof_thick m thick",
    unit: "Cum",
    formula: "roof_l * roof_b * roof_thick",
  },
  {
    sorCode: "RJ048",
    description: "Steel reinforcement Fe500D for roof slab (10mm@150 c/c both ways)",
    unit: "MT",
    formula: "roof_l * roof_b * roof_thick * 3500 * 0.001",
  },
  {
    sorCode: "RJ042",
    description: "RCC M20 parapet wall (115mm thick × parapet_h m)",
    unit: "Cum",
    formula: "ext_wall_len * 0.115 * parapet_h",
  },

  // ══ 6. MASONRY ═══════════════════════════════════════════════════════════
  {
    sorCode: "RJ055",
    description: "Brick masonry 230mm thick in CM 1:6 for external/peripheral walls",
    unit: "Cum",
    formula: "ext_wall_len * 0.23 * wall_h - main_door_nos * main_door_w * main_door_h * 0.23 - window_nos * window_w * window_h * 0.23",
  },
  {
    sorCode: "RJ056",
    description: "Brick masonry 115mm (half-brick) for WC cubicle partitions",
    unit: "Cum",
    formula: "partition_len * 0.115 * wall_h",
  },

  // ══ 7. WATERPROOFING ══════════════════════════════════════════════════════
  {
    sorCode: "RJ113",
    description: "Waterproofing treatment on roof/terrace — 2-coat bitumen felt + IPS 40mm",
    unit: "Sqm",
    formula: "roof_l * roof_b",
  },
  {
    sorCode: "RJ114",
    description: "Integral cement waterproofing (Xypex/Kryton) on floor in wet area before tiling",
    unit: "Sqm",
    formula: "floor_area",
  },

  // ══ 8. FLOORING ═══════════════════════════════════════════════════════════
  {
    sorCode: "RJ097",
    description: "Anti-skid ceramic floor tiles 300×300mm in CM 1:3 — toilet floor area",
    unit: "Sqm",
    formula: "floor_area",
  },
  {
    sorCode: "RJ100",
    description: "Ceramic skirting tile 100mm ht in CM 1:3",
    unit: "Rmt",
    formula: "ext_wall_len + partition_len",
  },

  // ══ 9. WALL TILES ══════════════════════════════════════════════════════════
  {
    sorCode: "RJ099",
    description: "Glazed ceramic wall tiles 200×300mm in CM 1:3 (full height internal walls)",
    unit: "Sqm",
    formula: "wall_tile_area",
  },

  // ══ 10. PLASTER ═══════════════════════════════════════════════════════════
  {
    sorCode: "RJ080",
    description: "Cement plaster 12mm 1:4 on ceiling soffit (above tile line)",
    unit: "Sqm",
    formula: "roof_l * roof_b",
  },
  {
    sorCode: "RJ081",
    description: "Cement plaster 20mm 1:4 on external faces of walls",
    unit: "Sqm",
    formula: "ext_wall_len * (wall_h + parapet_h) - main_door_nos * main_door_w * main_door_h - window_nos * window_w * window_h",
  },

  // ══ 11. PAINTING ══════════════════════════════════════════════════════════
  {
    sorCode: "RJ160",
    description: "Exterior emulsion paint (2 coats) on plastered external walls",
    unit: "Sqm",
    formula: "ext_wall_len * (wall_h + parapet_h) - main_door_nos * main_door_w * main_door_h - window_nos * window_w * window_h",
  },
  {
    sorCode: "RJ159",
    description: "PVA distemper (2 coats) on ceiling plaster",
    unit: "Sqm",
    formula: "roof_l * roof_b",
  },

  // ══ 12. DOORS ═════════════════════════════════════════════════════════════
  {
    sorCode: "RJ145",
    description: "Aluminium framed glazed door (main entry) main_door_w × main_door_h m",
    unit: "Sqm",
    formula: "main_door_nos * main_door_w * main_door_h",
  },
  {
    sorCode: "RJ139",
    description: "PVC hollow-core door shutter (WC cubicle) wc_door_w × wc_door_h m with SS fittings",
    unit: "Sqm",
    formula: "wc_door_nos * wc_door_w * wc_door_h",
  },
  {
    sorCode: "RJ138",
    description: "PVC door frame 60×35mm for WC cubicle doors",
    unit: "Rmt",
    formula: "wc_door_nos * (2 * wc_door_h + wc_door_w)",
  },

  // ══ 13. WINDOWS / VENTILATORS ════════════════════════════════════════════
  {
    sorCode: "RJ145",
    description: "Aluminium louvered ventilator/window with fly-mesh window_w × window_h m",
    unit: "Sqm",
    formula: "window_nos * window_w * window_h",
  },

  // ══ 14. SANITARY FIXTURES — WC ═══════════════════════════════════════════
  {
    sorCode: "MR010",
    description: "Indian (Orissa) WC pan (white vitreous china) with P/S-trap, fixing in CM 1:4",
    unit: "nos",
    formula: "indian_wc_nos",
  },
  {
    sorCode: "MR011",
    description: "European WC pan with seat cover (white vitreous china), P-trap, fixing",
    unit: "nos",
    formula: "euro_wc_nos",
  },
  {
    sorCode: "MR012",
    description: "Disabled / accessible WC pan with grab bars, raised height, fixing",
    unit: "nos",
    formula: "disabled_wc_nos",
  },
  {
    sorCode: "MR013",
    description: "Low-level flushing cistern 9L (PVC, dual-flush mechanism) with fittings",
    unit: "nos",
    formula: "cistern_nos",
  },

  // ══ 15. SANITARY FIXTURES — URINALS ══════════════════════════════════════
  {
    sorCode: "MR014",
    description: "Wall-hung urinal bowl (white vitreous china) with spreader, fixing",
    unit: "nos",
    formula: "urinal_nos",
  },
  {
    sorCode: "MR015",
    description: "Flush valve (UF type, 15mm) for urinal with CP fittings",
    unit: "nos",
    formula: "flush_valve_nos",
  },

  // ══ 16. SANITARY FIXTURES — WASH BASINS ══════════════════════════════════
  {
    sorCode: "MR016",
    description: "Wash basin (white vitreous china, 550×400mm) with pedestal, CP fittings, P-trap",
    unit: "nos",
    formula: "washbasin_nos",
  },
  {
    sorCode: "MR017",
    description: "CP pillar cock (15mm) with inlet connection for wash basin",
    unit: "nos",
    formula: "washbasin_nos",
  },
  {
    sorCode: "MR018",
    description: "Mirror (600×450mm, beveled edge) fixed on wall above wash basin",
    unit: "nos",
    formula: "washbasin_nos",
  },
  {
    sorCode: "MR019",
    description: "Toilet paper holder / soap dish (SS, surface mounted)",
    unit: "nos",
    formula: "indian_wc_nos + euro_wc_nos + disabled_wc_nos",
  },

  // ══ 17. PLUMBING — WATER SUPPLY ══════════════════════════════════════════
  {
    sorCode: "MR020",
    description: "CPVC water supply pipe 25mm dia (main riser/distribution) with fittings",
    unit: "Rmt",
    formula: "supply_25mm_rm",
  },
  {
    sorCode: "MR021",
    description: "CPVC water supply pipe 15mm dia (branch to each fixture) with fittings",
    unit: "Rmt",
    formula: "supply_15mm_rm",
  },
  {
    sorCode: "MR022",
    description: "Gate valve / stop cock 15mm (ISI marked) at each branch point",
    unit: "nos",
    formula: "stop_cock_nos",
  },
  {
    sorCode: "MR023",
    description: "HDPE overhead water storage tank (overhead_tank_cap L) with ball valve, inlet/outlet",
    unit: "nos",
    formula: "overhead_tank_cap > 0 ? 1 : 0",
  },

  // ══ 18. PLUMBING — DRAINAGE ══════════════════════════════════════════════
  {
    sorCode: "MR030",
    description: "UPVC soil pipe 110mm (SWR) for WC drain with fittings, clamps",
    unit: "Rmt",
    formula: "soil_pipe_110_rm",
  },
  {
    sorCode: "MR031",
    description: "UPVC waste pipe 75mm (SWR) for wash basin / urinal drain with fittings",
    unit: "Rmt",
    formula: "waste_pipe_75_rm",
  },
  {
    sorCode: "MR032",
    description: "UPVC floor trap (nahani trap) 100mm with grating, fixing",
    unit: "nos",
    formula: "floor_trap_nos",
  },
  {
    sorCode: "MR033",
    description: "Cleanout (rodding) access with screw cap, 110mm",
    unit: "nos",
    formula: "cleanout_nos",
  },
  {
    sorCode: "MR034",
    description: "Gully trap (CI, 150×100mm) with grating at external drain outlet",
    unit: "nos",
    formula: "gully_trap_nos",
  },

  // ══ 19. EXTERNAL DRAINAGE ════════════════════════════════════════════════
  {
    sorCode: "RJ042",
    description: "RCC M20 brick manhole (600×450mm inside) with CI frame and cover",
    unit: "nos",
    formula: "manhole_nos",
  },
  {
    sorCode: "RJ055",
    description: "Brick masonry septic tank in CM 1:4 (septic_tank_vol Cum) with RCC cover slab",
    unit: "Cum",
    formula: "septic_tank_vol",
  },
  {
    sorCode: "RJ013",
    description: "Earthwork excavation for septic tank and soak pit",
    unit: "Cum",
    formula: "septic_tank_vol * 1.40 + soak_pit_nos * 2.0 * 2.0 * 2.0",
  },
  {
    sorCode: "RJ038",
    description: "PCC M10 100mm below septic tank",
    unit: "Cum",
    formula: "septic_tank_vol > 0 ? 0.10 * (septic_tank_vol / 1.5) : 0",
  },

  // ══ 20. ELECTRICAL ════════════════════════════════════════════════════════
  {
    sorCode: "EL010",
    description: "Exhaust fan 300/350mm (BLDC/capacitor type) with shutter, supply and fixing",
    unit: "nos",
    formula: "exhaust_fan_nos",
  },
  {
    sorCode: "EL011",
    description: "CFL/LED light fitting (18W, IP54 rated, corrosion proof) with conduit wiring point",
    unit: "nos",
    formula: "light_point_nos",
  },
  {
    sorCode: "EL012",
    description: "Concealed conduit wiring 1.5 sqmm (power + lighting points, PVC conduit 20mm)",
    unit: "nos",
    formula: "light_point_nos + exhaust_fan_nos",
  },
  {
    sorCode: "EL013",
    description: "MS DB box with MCBs (6A/16A), 4-way, surface mounted with earthing",
    unit: "nos",
    formula: "1",
  },
];

async function seed() {
  console.log("🚻 Seeding proper Toilet Block template…");

  await p.wizardTemplate.upsert({
    where: { id: "depot-toilet-001" },
    create: {
      id: "depot-toilet-001",
      name: "Toilet Block",
      description: "Full-parametric depot toilet block — civil, sanitary fixtures, plumbing, drainage and electrical BOQ",
      icon: "🚻",
      buildingType: "CUSTOM",
      parameters: PARAMS,
      boqItemFormulas: BOQ,
      measurementPresets: {
        // sensible defaults for a medium 2+2 toilet block
        block_l: 9.0, block_b: 4.5, wall_h: 3.0, parapet_h: 0.90,
        strip_ft_len: 27.0, strip_ft_w: 0.45, strip_ft_h: 0.45, exc_depth: 0.90,
        ext_wall_len: 27.0, partition_len: 12.0,
        roof_l: 9.0, roof_b: 4.5, roof_thick: 0.125,
        main_door_nos: 2, main_door_w: 1.20, main_door_h: 2.10,
        wc_door_nos: 4, wc_door_w: 0.75, wc_door_h: 1.50,
        window_nos: 4, window_w: 0.60, window_h: 0.45,
        indian_wc_nos: 4, euro_wc_nos: 0, disabled_wc_nos: 0,
        urinal_nos: 2, washbasin_nos: 2,
        cistern_nos: 4, flush_valve_nos: 2,
        supply_25mm_rm: 15, supply_15mm_rm: 30, stop_cock_nos: 10,
        overhead_tank_cap: 500,
        soil_pipe_110_rm: 20, waste_pipe_75_rm: 15,
        floor_trap_nos: 6, cleanout_nos: 2, gully_trap_nos: 2,
        manhole_nos: 1, soak_pit_nos: 1,
        exhaust_fan_nos: 4, light_point_nos: 6,
      },
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "Toilet Block",
      description: "Full-parametric depot toilet block — civil, sanitary fixtures, plumbing, drainage and electrical BOQ",
      icon: "🚻",
      parameters: PARAMS,
      boqItemFormulas: BOQ,
      measurementPresets: {
        block_l: 9.0, block_b: 4.5, wall_h: 3.0, parapet_h: 0.90,
        strip_ft_len: 27.0, strip_ft_w: 0.45, strip_ft_h: 0.45, exc_depth: 0.90,
        ext_wall_len: 27.0, partition_len: 12.0,
        roof_l: 9.0, roof_b: 4.5, roof_thick: 0.125,
        main_door_nos: 2, main_door_w: 1.20, main_door_h: 2.10,
        wc_door_nos: 4, wc_door_w: 0.75, wc_door_h: 1.50,
        window_nos: 4, window_w: 0.60, window_h: 0.45,
        indian_wc_nos: 4, euro_wc_nos: 0, disabled_wc_nos: 0,
        urinal_nos: 2, washbasin_nos: 2,
        cistern_nos: 4, flush_valve_nos: 2,
        supply_25mm_rm: 15, supply_15mm_rm: 30, stop_cock_nos: 10,
        overhead_tank_cap: 500,
        soil_pipe_110_rm: 20, waste_pipe_75_rm: 15,
        floor_trap_nos: 6, cleanout_nos: 2, gully_trap_nos: 2,
        manhole_nos: 1, soak_pit_nos: 1,
        exhaust_fan_nos: 4, light_point_nos: 6,
      },
    },
  });

  console.log(`  ✓ Toilet Block — ${PARAMS.length} parameters, ${BOQ.length} BOQ items`);
  console.log("✅ Done!");
  await p.$disconnect();
}

seed().catch((e) => { console.error(e); p.$disconnect(); process.exit(1); });
