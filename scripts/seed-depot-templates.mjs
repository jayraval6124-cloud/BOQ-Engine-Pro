/**
 * Seed script: depot wizard templates
 * Run from project root: node scripts/seed-depot-templates.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────────────

function buildVarsStr(params) {
  return params.map((p) => {
    const n = p.name;
    const dims = p.dims;
    if (dims === "n")       return `const ${n} = (params["${n}"]?.rows?.[0]?.nos ?? 0);`;
    if (dims === "l" || dims === "b" || dims === "h" || dims === "d")
                            return `const ${n} = (params["${n}"]?.rows?.[0]?.L ?? 0);`;
    if (dims === "lxb")     return `const ${n}_L = (params["${n}"]?.rows?.[0]?.L ?? 0);\nconst ${n}_B = (params["${n}"]?.rows?.[0]?.B ?? 0);\nconst ${n} = ${n}_L * ${n}_B;`;
    if (dims === "lxbxh")   return `const ${n}_L = (params["${n}"]?.rows?.[0]?.L ?? 0);\nconst ${n}_B = (params["${n}"]?.rows?.[0]?.B ?? 0);\nconst ${n}_H = (params["${n}"]?.rows?.[0]?.H ?? 0);\nconst ${n} = ${n}_L * ${n}_B * ${n}_H;`;
    // table: sum of rows
    return `const ${n} = ((params["${n}"]?.rows ?? []).reduce((s,r) => s + (r.nos||1)*(r.L||0)*(r.B>0?r.B:1)*(r.H>0?r.H:1), 0));`;
  }).join("\n");
}

// ─── DM Quarter (Bardoli) template ─────────────────────────────────────────

const DM_PARAMS = [
  { name: "plinth_area",       label: "Plinth Area",             unit: "Sqm",  dims: "lxb"   },
  { name: "no_of_floors",      label: "No. of Floors (G+?)",     unit: "nos",  dims: "n"     },
  // Footings
  { name: "f1_nos",            label: "F1 Footing Count",        unit: "nos",  dims: "n"     },
  { name: "f1_exc_l",         label: "F1 Exc. Length",          unit: "m",    dims: "l"     },
  { name: "f1_exc_b",         label: "F1 Exc. Width",           unit: "m",    dims: "l"     },
  { name: "f1_exc_h",         label: "F1 Exc. Depth",           unit: "m",    dims: "l"     },
  { name: "f1_ft_l",          label: "F1 Footing L",            unit: "m",    dims: "l"     },
  { name: "f1_ft_b",          label: "F1 Footing B",            unit: "m",    dims: "l"     },
  { name: "f1_ft_h",          label: "F1 Footing H (PCC+RCC)",  unit: "m",    dims: "l"     },
  { name: "f2_nos",            label: "F2 Footing Count",        unit: "nos",  dims: "n"     },
  { name: "f2_exc_l",         label: "F2 Exc. Length",          unit: "m",    dims: "l"     },
  { name: "f2_exc_b",         label: "F2 Exc. Width",           unit: "m",    dims: "l"     },
  { name: "f2_exc_h",         label: "F2 Exc. Depth",           unit: "m",    dims: "l"     },
  { name: "f2_ft_l",          label: "F2 Footing L",            unit: "m",    dims: "l"     },
  { name: "f2_ft_b",          label: "F2 Footing B",            unit: "m",    dims: "l"     },
  { name: "f3_nos",            label: "F3 Footing Count",        unit: "nos",  dims: "n"     },
  { name: "f3_exc_l",         label: "F3 Exc. Length",          unit: "m",    dims: "l"     },
  { name: "f3_exc_b",         label: "F3 Exc. Width",           unit: "m",    dims: "l"     },
  { name: "f3_exc_h",         label: "F3 Exc. Depth",           unit: "m",    dims: "l"     },
  { name: "f3_ft_l",          label: "F3 Footing L",            unit: "m",    dims: "l"     },
  { name: "f3_ft_b",          label: "F3 Footing B",            unit: "m",    dims: "l"     },
  // Columns
  { name: "col_nos",           label: "Total Columns",           unit: "nos",  dims: "n"     },
  { name: "col_size",          label: "Column Size",             unit: "m",    dims: "l"     },
  { name: "col_h_gf",         label: "Column Height GF",        unit: "m",    dims: "l"     },
  { name: "col_h_ff",         label: "Column Height FF",        unit: "m",    dims: "l"     },
  // Building
  { name: "wall_len_gf",      label: "Wall Length GF",          unit: "m",    dims: "l"     },
  { name: "wall_len_ff",      label: "Wall Length FF",          unit: "m",    dims: "l"     },
  { name: "wall_h_gf",       label: "Wall Height GF",          unit: "m",    dims: "l"     },
  { name: "wall_h_ff",       label: "Wall Height FF",          unit: "m",    dims: "l"     },
  { name: "gf_slab_area",    label: "GF Slab / Plinth Slab",   unit: "Sqm",  dims: "lxb"  },
  { name: "roof_slab_area",  label: "Roof Slab Area",          unit: "Sqm",  dims: "lxb"  },
  { name: "staircase_area",  label: "Staircase Slab Area",     unit: "Sqm",  dims: "lxb"  },
  // Openings
  { name: "door_area",        label: "Door Area",               unit: "Sqm",  dims: null    },
  { name: "window_area",      label: "Window Area",             unit: "Sqm",  dims: null    },
  // Finishing
  { name: "floor_area",       label: "Flooring Area (Total)",   unit: "Sqm",  dims: "lxb"  },
  { name: "ext_plaster_area", label: "External Plaster Area",   unit: "Sqm",  dims: null    },
  { name: "int_plaster_area", label: "Internal Plaster Area",   unit: "Sqm",  dims: null    },
  // CW
  { name: "cw_rm",            label: "CW Running Meter",        unit: "m",    dims: "l"     },
  { name: "cw_h",             label: "CW Height (above GL)",    unit: "m",    dims: "l"     },
  { name: "cw_col_nos",       label: "CW Column Count",         unit: "nos",  dims: "n"     },
];

const DM_BOQ = [
  // ── EARTHWORK ───────────────────────────────────────────────────────────
  { sorCode: "RJ013", description: "Earthwork in excavation for foundation, F1 footings",         unit: "Cum", formula: "f1_nos * f1_exc_l * f1_exc_b * f1_exc_h" },
  { sorCode: "RJ013", description: "Earthwork in excavation for foundation, F2 footings",         unit: "Cum", formula: "f2_nos * f2_exc_l * f2_exc_b * f2_exc_h" },
  { sorCode: "RJ013", description: "Earthwork in excavation for foundation, F3 footings",         unit: "Cum", formula: "f3_nos * f3_exc_l * f3_exc_b * f3_exc_h" },
  { sorCode: "RJ016", description: "Earth filling in plinth below floors using approved material", unit: "Cum", formula: "plinth_area * 0.30" },
  { sorCode: "RJ019", description: "Disposal of surplus excavated earth (lead 50m)",               unit: "Cum", formula: "(f1_nos*f1_exc_l*f1_exc_b*f1_exc_h + f2_nos*f2_exc_l*f2_exc_b*f2_exc_h + f3_nos*f3_exc_l*f3_exc_b*f3_exc_h) * 0.40" },

  // ── PCC ─────────────────────────────────────────────────────────────────
  { sorCode: "RJ038", description: "PCC M10 (1:3:6) below F1 footings 75mm thick",    unit: "Cum", formula: "f1_nos * f1_ft_l * f1_ft_b * 0.075" },
  { sorCode: "RJ038", description: "PCC M10 (1:3:6) below F2 footings 75mm thick",    unit: "Cum", formula: "f2_nos * f2_ft_l * f2_ft_b * 0.075" },
  { sorCode: "RJ038", description: "PCC M10 (1:3:6) below F3 footings 75mm thick",    unit: "Cum", formula: "f3_nos * f3_ft_l * f3_ft_b * 0.075" },
  { sorCode: "RJ038", description: "PCC M15 (1:2:4) for plinth beam, column pedestals", unit: "Cum", formula: "plinth_area * 0.05" },

  // ── RCC FOOTINGS ─────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for F1 footings (isolated)",              unit: "Cum", formula: "f1_nos * f1_ft_l * f1_ft_b * f1_ft_h" },
  { sorCode: "RJ042", description: "RCC M20 for F2 footings (isolated)",              unit: "Cum", formula: "f2_nos * f2_ft_l * f2_ft_b * f1_ft_h" },
  { sorCode: "RJ042", description: "RCC M20 for F3 footings (isolated)",              unit: "Cum", formula: "f3_nos * f3_ft_l * f3_ft_b * f1_ft_h" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for footings",          unit: "MT",  formula: "(f1_nos*f1_ft_l*f1_ft_b*f1_ft_h + f2_nos*f2_ft_l*f2_ft_b*f1_ft_h + f3_nos*f3_ft_l*f3_ft_b*f1_ft_h) * 2500 * 0.001" },

  // ── PLINTH BEAM / PEDESTAL ───────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for plinth beams (230×450mm)",            unit: "Cum", formula: "wall_len_gf * 0.23 * 0.45" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for plinth beams",      unit: "MT",  formula: "wall_len_gf * 0.23 * 0.45 * 2500 * 0.001" },

  // ── COLUMNS GF ─────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for columns GF (col_size × col_size)",    unit: "Cum", formula: "col_nos * col_size * col_size * col_h_gf" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for GF columns",        unit: "MT",  formula: "col_nos * col_size * col_size * col_h_gf * 2500 * 0.001" },

  // ── COLUMNS FF ─────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for columns FF",                           unit: "Cum", formula: "col_nos * col_size * col_size * col_h_ff" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for FF columns",        unit: "MT",  formula: "col_nos * col_size * col_size * col_h_ff * 2500 * 0.001" },

  // ── BEAMS GF ───────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for beams GF (230×450mm)",               unit: "Cum", formula: "wall_len_gf * 0.23 * 0.45" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for GF beams",         unit: "MT",  formula: "wall_len_gf * 0.23 * 0.45 * 2500 * 0.001" },

  // ── BEAMS FF ───────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for beams FF (230×450mm)",               unit: "Cum", formula: "wall_len_ff * 0.23 * 0.45" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for FF beams",         unit: "MT",  formula: "wall_len_ff * 0.23 * 0.45 * 2500 * 0.001" },

  // ── GF SLAB ────────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for GF slab 125mm thick",                 unit: "Cum", formula: "gf_slab_area * 0.125" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for GF slab",          unit: "MT",  formula: "gf_slab_area * 0.125 * 2500 * 0.001" },

  // ── ROOF SLAB ──────────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for terrace/roof slab 150mm thick",       unit: "Cum", formula: "roof_slab_area * 0.150" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for terrace slab",     unit: "MT",  formula: "roof_slab_area * 0.150 * 2500 * 0.001" },

  // ── STAIRCASE SLAB ─────────────────────────────────────────────────────
  { sorCode: "RJ042", description: "RCC M20 for staircase waist slab 150mm",          unit: "Cum", formula: "staircase_area * 0.150" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for staircase slab",   unit: "MT",  formula: "staircase_area * 0.150 * 2500 * 0.001" },

  // ── BRICKWORK GF ──────────────────────────────────────────────────────
  { sorCode: "RJ055", description: "Brick masonry 230mm thick in CM 1:6 in GF walls", unit: "Cum", formula: "(wall_len_gf * 0.23 * wall_h_gf) - (col_nos * col_size * col_size * col_h_gf) - door_area * 0.23 - window_area * 0.115" },

  // ── BRICKWORK FF ──────────────────────────────────────────────────────
  { sorCode: "RJ055", description: "Brick masonry 230mm thick in CM 1:6 in FF walls", unit: "Cum", formula: "(wall_len_ff * 0.23 * wall_h_ff) - (col_nos * col_size * col_size * col_h_ff) - door_area * 0.23 - window_area * 0.115" },

  // ── 115MM BRICKWORK (partitions) ─────────────────────────────────────
  { sorCode: "RJ056", description: "Brick masonry 115mm half-brick partition walls",   unit: "Cum", formula: "wall_len_gf * 0.115 * wall_h_gf * 0.10" },

  // ── PLASTER EXTERNAL ──────────────────────────────────────────────────
  { sorCode: "RJ081", description: "Cement plaster 20mm 1:3 external walls",           unit: "Sqm", formula: "ext_plaster_area" },

  // ── PLASTER INTERNAL ──────────────────────────────────────────────────
  { sorCode: "RJ080", description: "Cement plaster 12mm 1:6 internal walls",           unit: "Sqm", formula: "int_plaster_area" },
  { sorCode: "RJ080", description: "Ceiling plaster 6mm 1:4 on RCC slab soffit",       unit: "Sqm", formula: "(gf_slab_area + roof_slab_area) * (no_of_floors > 1 ? 2 : 1) * 0.50" },

  // ── WATERPROOFING ─────────────────────────────────────────────────────
  { sorCode: "RJ113", description: "Waterproofing treatment IPS 40mm on terrace",      unit: "Sqm", formula: "roof_slab_area" },
  { sorCode: "RJ114", description: "Waterproofing treatment in bathrooms (epoxy)",      unit: "Sqm", formula: "plinth_area * 0.15" },

  // ── FLOORING ──────────────────────────────────────────────────────────
  { sorCode: "RJ096", description: "Vitrified tiles 600×600 in CM 1:4 on floors",      unit: "Sqm", formula: "floor_area" },
  { sorCode: "RJ097", description: "Ceramic tiles 300×300 in CM 1:4 in bathrooms",     unit: "Sqm", formula: "floor_area * 0.15" },
  { sorCode: "RJ100", description: "Skirting 100mm ht vitrified tiles",                 unit: "Rmt", formula: "(wall_len_gf + wall_len_ff) * 1.0" },

  // ── DOORS ─────────────────────────────────────────────────────────────
  { sorCode: "RJ138", description: "Teak wood panel door frame (90×65mm)",              unit: "Rmt", formula: "door_area / 2.1 * (2.1*2 + 1.2)" },
  { sorCode: "RJ139", description: "Flush door shutter 35mm thick, both sides laminate",unit: "Sqm", formula: "door_area" },

  // ── WINDOWS ───────────────────────────────────────────────────────────
  { sorCode: "RJ145", description: "Aluminium sliding window with mosquito mesh",       unit: "Sqm", formula: "window_area" },

  // ── PAINTING ─────────────────────────────────────────────────────────
  { sorCode: "RJ160", description: "Exterior emulsion paint two coats on plastered surface", unit: "Sqm", formula: "ext_plaster_area" },
  { sorCode: "RJ159", description: "Interior PVA distemper two coats on walls/ceiling", unit: "Sqm", formula: "int_plaster_area * 1.10" },
  { sorCode: "RJ162", description: "Oil paint on wood doors (2 coats)",                  unit: "Sqm", formula: "door_area * 2" },

  // ── COMPOUND WALL ─────────────────────────────────────────────────────
  { sorCode: "RJ013", description: "Earthwork excavation for CW foundation",             unit: "Cum", formula: "cw_rm * 0.60 * 0.60" },
  { sorCode: "RJ038", description: "PCC M10 below CW footing 100mm thick",               unit: "Cum", formula: "cw_rm * 0.60 * 0.10" },
  { sorCode: "RJ042", description: "RCC M20 for CW column footing",                      unit: "Cum", formula: "cw_col_nos * 0.30 * 0.30 * 0.30" },
  { sorCode: "RJ042", description: "RCC M20 for CW columns 230×230mm",                   unit: "Cum", formula: "cw_col_nos * 0.23 * 0.23 * (cw_h + 0.45)" },
  { sorCode: "RJ055", description: "Brickwork 230mm in CM 1:6 for CW panels",            unit: "Cum", formula: "(cw_rm - cw_col_nos * 0.23) * 0.23 * cw_h" },
  { sorCode: "RJ081", description: "Plaster 12mm 1:4 both sides CW",                     unit: "Sqm", formula: "cw_rm * cw_h * 2" },
  { sorCode: "RJ160", description: "Exterior emulsion paint on CW both sides",           unit: "Sqm", formula: "cw_rm * cw_h * 2" },

  // ── PLUMBING (lump sum approximation) ────────────────────────────────
  { sorCode: "MR001", description: "Internal water supply plumbing (UPVC 25mm to 15mm)", unit: "LS", formula: "plinth_area * no_of_floors * 150" },
  { sorCode: "MR002", description: "Sanitary fittings and drainage (CI soil pipes)",      unit: "LS", formula: "plinth_area * no_of_floors * 200" },

  // ── ELECTRICAL (lump sum approximation) ──────────────────────────────
  { sorCode: "EL001", description: "Internal electrical wiring (concealed conduit)",      unit: "LS", formula: "plinth_area * no_of_floors * 250" },
];

// ─── Workshop template ─────────────────────────────────────────────────────

const WORKSHOP_PARAMS = [
  { name: "plinth_area",      label: "Plinth Area",              unit: "Sqm", dims: "lxb"  },
  { name: "col_nos",          label: "Steel Column Count",        unit: "nos", dims: "n"    },
  { name: "col_h",            label: "Column Height",             unit: "m",   dims: "l"   },
  { name: "truss_span",       label: "Truss Span",                unit: "m",   dims: "l"   },
  { name: "truss_nos",        label: "Truss Count",               unit: "nos", dims: "n"   },
  { name: "roofing_area",     label: "Roofing Sheet Area",        unit: "Sqm", dims: "lxb" },
  { name: "gutter_rm",        label: "Gutter Length",             unit: "m",   dims: "l"   },
  { name: "floor_area",       label: "Floor Area (PCC+flooring)", unit: "Sqm", dims: "lxb" },
  { name: "wall_len",         label: "Peripheral Wall Length",    unit: "m",   dims: "l"   },
  { name: "wall_h",           label: "Peripheral Wall Height",    unit: "m",   dims: "l"   },
  { name: "door_area",        label: "Shutter/Door Area",         unit: "Sqm", dims: null  },
];

const WORKSHOP_BOQ = [
  { sorCode: "RJ013", description: "Earthwork excavation for column footings",            unit: "Cum", formula: "col_nos * 1.20 * 1.20 * 1.50" },
  { sorCode: "RJ038", description: "PCC M10 150mm thick below footings",                  unit: "Cum", formula: "col_nos * 1.20 * 1.20 * 0.15" },
  { sorCode: "RJ042", description: "RCC M20 for isolated column footings",                unit: "Cum", formula: "col_nos * 1.00 * 1.00 * 0.45" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for footings",             unit: "MT",  formula: "col_nos * 1.00 * 1.00 * 0.45 * 2500 * 0.001" },
  { sorCode: "RJ038", description: "PCC M15 floor slab 100mm thick",                      unit: "Cum", formula: "floor_area * 0.10" },
  { sorCode: "RJ130", description: "Structural steel for columns (IS2062 A250)",           unit: "MT",  formula: "col_nos * col_h * 45 * 0.001" },
  { sorCode: "RJ131", description: "Steel roof truss fabrication and erection",           unit: "MT",  formula: "truss_nos * truss_span * 30 * 0.001" },
  { sorCode: "RJ135", description: "Galvalume roofing sheet 0.5mm thick",                 unit: "Sqm", formula: "roofing_area * 1.05" },
  { sorCode: "RJ136", description: "Ridge and gutter for roofing sheet",                  unit: "Rmt", formula: "gutter_rm" },
  { sorCode: "RJ055", description: "Brickwork 230mm peripheral walls CM 1:6",             unit: "Cum", formula: "wall_len * 0.23 * wall_h" },
  { sorCode: "RJ081", description: "Cement plaster 20mm 1:4 external walls",              unit: "Sqm", formula: "wall_len * wall_h" },
  { sorCode: "RJ145", description: "Rolling shutter/Industrial door",                     unit: "Sqm", formula: "door_area" },
  { sorCode: "RJ160", description: "Exterior emulsion paint on peripheral walls",         unit: "Sqm", formula: "wall_len * wall_h" },
  { sorCode: "RJ048", description: "Anti-corrosion paint 2 coats on steel structure",     unit: "Sqm", formula: "(col_nos * col_h * 0.8 + truss_nos * truss_span * 1.2) * 4" },
];

// ─── OHT template ──────────────────────────────────────────────────────────

const OHT_PARAMS = [
  { name: "tank_capacity",    label: "Tank Capacity",             unit: "KL",  dims: "n"   },
  { name: "tank_l",           label: "Tank Length (internal)",    unit: "m",   dims: "l"   },
  { name: "tank_b",           label: "Tank Width (internal)",     unit: "m",   dims: "l"   },
  { name: "tank_h",           label: "Tank Height (water depth)", unit: "m",   dims: "l"   },
  { name: "staging_h",        label: "Staging Height",            unit: "m",   dims: "l"   },
  { name: "col_nos",          label: "Staging Columns",           unit: "nos", dims: "n"   },
  { name: "col_size",         label: "Column Size (sq.m)",        unit: "m",   dims: "l"   },
];

const OHT_BOQ = [
  { sorCode: "RJ013", description: "Earthwork excavation for OHT column footings",        unit: "Cum", formula: "col_nos * (col_size + 0.60) * (col_size + 0.60) * 1.80" },
  { sorCode: "RJ038", description: "PCC M10 below column footings",                        unit: "Cum", formula: "col_nos * (col_size + 0.60) * (col_size + 0.60) * 0.10" },
  { sorCode: "RJ042", description: "RCC M25 for isolated footings OHT staging",           unit: "Cum", formula: "col_nos * (col_size + 0.30) * (col_size + 0.30) * 0.60" },
  { sorCode: "RJ048", description: "Steel reinforcement for staging footings",             unit: "MT",  formula: "col_nos * (col_size + 0.30) * (col_size + 0.30) * 0.60 * 3000 * 0.001" },
  { sorCode: "RJ042", description: "RCC M25 for staging columns",                         unit: "Cum", formula: "col_nos * col_size * col_size * staging_h" },
  { sorCode: "RJ048", description: "Steel reinforcement for staging columns",              unit: "MT",  formula: "col_nos * col_size * col_size * staging_h * 3500 * 0.001" },
  { sorCode: "RJ042", description: "RCC M25 for braces between staging columns",          unit: "Cum", formula: "col_nos * 0.23 * 0.30 * col_size * 2" },
  { sorCode: "RJ042", description: "RCC M25 for tank walls (200mm thick)",                unit: "Cum", formula: "2 * (tank_l + tank_b) * 0.20 * (tank_h + 0.30)" },
  { sorCode: "RJ048", description: "Steel reinforcement for tank walls",                   unit: "MT",  formula: "2 * (tank_l + tank_b) * 0.20 * (tank_h + 0.30) * 4000 * 0.001" },
  { sorCode: "RJ042", description: "RCC M25 for tank floor slab 200mm thick",             unit: "Cum", formula: "(tank_l + 0.40) * (tank_b + 0.40) * 0.20" },
  { sorCode: "RJ048", description: "Steel reinforcement for tank floor",                   unit: "MT",  formula: "(tank_l + 0.40) * (tank_b + 0.40) * 0.20 * 4000 * 0.001" },
  { sorCode: "RJ042", description: "RCC M25 for roof dome slab 125mm thick",              unit: "Cum", formula: "(tank_l + 0.40) * (tank_b + 0.40) * 0.125" },
  { sorCode: "RJ113", description: "Integral waterproofing inside tank (Xypex/cement)",   unit: "Sqm", formula: "2 * (tank_l + tank_b) * tank_h + tank_l * tank_b" },
];

// ─── Toilet Block template ─────────────────────────────────────────────────

const TOILET_PARAMS = [
  { name: "plinth_area",      label: "Plinth Area",               unit: "Sqm", dims: "lxb" },
  { name: "no_of_seats",      label: "No. of WC Seats (total)",   unit: "nos", dims: "n"   },
  { name: "wall_len",         label: "Total Wall Length",          unit: "m",   dims: "l"  },
  { name: "wall_h",           label: "Wall Height",                unit: "m",   dims: "l"  },
  { name: "door_area",        label: "Door Area",                  unit: "Sqm", dims: null  },
];

const TOILET_BOQ = [
  { sorCode: "RJ013", description: "Earthwork excavation for toilet block foundation",    unit: "Cum", formula: "plinth_area * 0.90" },
  { sorCode: "RJ038", description: "PCC M10 100mm thick bed below footings",              unit: "Cum", formula: "plinth_area * 0.10" },
  { sorCode: "RJ042", description: "RCC M20 strip foundation (300×400mm)",               unit: "Cum", formula: "wall_len * 0.30 * 0.40" },
  { sorCode: "RJ042", description: "RCC M20 plinth beam (230×300mm)",                    unit: "Cum", formula: "wall_len * 0.23 * 0.30" },
  { sorCode: "RJ042", description: "RCC M20 roof slab 100mm thick",                      unit: "Cum", formula: "plinth_area * 0.10" },
  { sorCode: "RJ055", description: "Brickwork 230mm in CM 1:6 for walls",                unit: "Cum", formula: "wall_len * 0.23 * wall_h" },
  { sorCode: "RJ081", description: "Cement plaster 15mm 1:4 external walls",             unit: "Sqm", formula: "wall_len * wall_h" },
  { sorCode: "RJ080", description: "Ceramic wall tiles 200×300 up to 2.1m ht internal",  unit: "Sqm", formula: "wall_len * 2.10" },
  { sorCode: "RJ097", description: "Ceramic floor tiles anti-skid 300×300 in CM 1:3",    unit: "Sqm", formula: "plinth_area" },
  { sorCode: "RJ113", description: "Waterproofing treatment on RCC slab terrace",        unit: "Sqm", formula: "plinth_area" },
  { sorCode: "RJ139", description: "PVC flush door shutters 30mm thick",                  unit: "Sqm", formula: "door_area" },
  { sorCode: "RJ160", description: "Exterior emulsion paint two coats on walls",         unit: "Sqm", formula: "wall_len * wall_h" },
  { sorCode: "MR002", description: "Sanitary fixtures: WC pans, wash basins, urinals",   unit: "nos", formula: "no_of_seats" },
  { sorCode: "MR001", description: "Plumbing water supply UPVC pipes",                    unit: "LS",  formula: "plinth_area * 350" },
];

// ─── Oil Room template ─────────────────────────────────────────────────────

const OIL_PARAMS = [
  { name: "plinth_area",      label: "Plinth Area",               unit: "Sqm", dims: "lxb" },
  { name: "wall_len",         label: "Total Wall Length",          unit: "m",   dims: "l"   },
  { name: "wall_h",           label: "Wall Height",                unit: "m",   dims: "l"   },
];

const OIL_BOQ = [
  { sorCode: "RJ013", description: "Earthwork excavation for oil room foundation",        unit: "Cum", formula: "plinth_area * 1.0" },
  { sorCode: "RJ038", description: "PCC M15 100mm thick below footing / floor",          unit: "Cum", formula: "plinth_area * 0.10" },
  { sorCode: "RJ042", description: "RCC M20 strip foundation 300×400mm",                 unit: "Cum", formula: "wall_len * 0.30 * 0.40" },
  { sorCode: "RJ042", description: "RCC M20 roof slab 100mm thick",                      unit: "Cum", formula: "plinth_area * 0.10" },
  { sorCode: "RJ055", description: "Brickwork 230mm in CM 1:6",                          unit: "Cum", formula: "wall_len * 0.23 * wall_h" },
  { sorCode: "RJ038", description: "IPS flooring 50mm thick with 1:1.5 hardener",        unit: "Sqm", formula: "plinth_area" },
  { sorCode: "RJ081", description: "Cement plaster 20mm 1:4 on walls",                   unit: "Sqm", formula: "wall_len * wall_h" },
  { sorCode: "RJ113", description: "Acid resistant tiles 150×150 oil proof flooring",    unit: "Sqm", formula: "plinth_area" },
  { sorCode: "RJ160", description: "Exterior emulsion paint two coats",                   unit: "Sqm", formula: "wall_len * wall_h" },
];

// ─── CC Road / Yard template ───────────────────────────────────────────────

const CC_ROAD_PARAMS = [
  { name: "road_length",      label: "Road Length",               unit: "m",   dims: "l"   },
  { name: "road_width",       label: "Road Width",                 unit: "m",   dims: "l"   },
  { name: "cc_thickness",     label: "CC Pavement Thickness",     unit: "m",   dims: "l"   },
  { name: "gsb_thickness",    label: "GSB Layer Thickness",       unit: "m",   dims: "l"   },
  { name: "kerb_length",      label: "Kerb Stone Length",         unit: "m",   dims: "l"   },
];

const CC_ROAD_BOQ = [
  { sorCode: "RJ021", description: "Scarifying and compacting existing ground by roller",     unit: "Sqm", formula: "road_length * road_width" },
  { sorCode: "RJ023", description: "Graded stone base (GSB) with compaction",                 unit: "Cum", formula: "road_length * road_width * gsb_thickness" },
  { sorCode: "RJ038", description: "PCC M20 pavement (plain cement concrete road)",           unit: "Cum", formula: "road_length * road_width * cc_thickness" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D (if reinforced CC slab)",      unit: "MT",  formula: "road_length * road_width * cc_thickness * 2000 * 0.001" },
  { sorCode: "RJ036", description: "Expansion joint filler material (bitumen/rubber)",        unit: "Rmt", formula: "road_length / 5.0" },
  { sorCode: "RJ072", description: "Kerb stone precast RCC 600×230×300mm",                   unit: "Rmt", formula: "kerb_length" },
  { sorCode: "RJ075", description: "Concrete edge beam for kerb 230×300mm",                   unit: "Rmt", formula: "kerb_length" },
];

// ─── Storm Water Drain template ────────────────────────────────────────────

const STORM_PARAMS = [
  { name: "drain_length",     label: "Total Drain Length",        unit: "m",   dims: "l"   },
  { name: "drain_width",      label: "Drain Width (inside)",      unit: "m",   dims: "l"   },
  { name: "drain_depth",      label: "Drain Depth (inside)",      unit: "m",   dims: "l"   },
  { name: "wall_thickness",   label: "Drain Wall Thickness",      unit: "m",   dims: "l"   },
  { name: "slab_thickness",   label: "Cover Slab Thickness",      unit: "m",   dims: "l"   },
  { name: "manhole_nos",      label: "Manholes / Catch Basins",   unit: "nos", dims: "n"   },
];

const STORM_BOQ = [
  { sorCode: "RJ013", description: "Earthwork excavation for drain trench",               unit: "Cum", formula: "drain_length * (drain_width + 2*wall_thickness + 0.30) * (drain_depth + 0.30)" },
  { sorCode: "RJ038", description: "PCC M10 100mm thick below drain floor",               unit: "Cum", formula: "drain_length * (drain_width + 2*wall_thickness) * 0.10" },
  { sorCode: "RJ042", description: "RCC M20 drain floor slab 150mm thick",               unit: "Cum", formula: "drain_length * (drain_width + 2*wall_thickness) * 0.15" },
  { sorCode: "RJ042", description: "RCC M20 drain side walls",                            unit: "Cum", formula: "drain_length * 2 * wall_thickness * drain_depth" },
  { sorCode: "RJ048", description: "Steel reinforcement Fe500D for drain structure",      unit: "MT",  formula: "(drain_length * (drain_width + 2*wall_thickness) * 0.15 + drain_length * 2 * wall_thickness * drain_depth) * 3000 * 0.001" },
  { sorCode: "RJ042", description: "RCC M20 precast cover slab (drain cover)",           unit: "Cum", formula: "drain_length * (drain_width + 2*wall_thickness + 0.10) * slab_thickness" },
  { sorCode: "RJ048", description: "Steel reinforcement for cover slab",                  unit: "MT",  formula: "drain_length * (drain_width + 2*wall_thickness + 0.10) * slab_thickness * 3000 * 0.001" },
  { sorCode: "RJ081", description: "CM 1:3 plastering inside drain walls and floor",     unit: "Sqm", formula: "drain_length * (drain_width + 2*drain_depth)" },
  { sorCode: "RJ042", description: "RCC M20 manhole chamber (1.2×0.9×1.2m) with frame", unit: "nos", formula: "manhole_nos" },
  { sorCode: "RJ016", description: "Backfilling with excavated earth in layers",          unit: "Cum", formula: "drain_length * (drain_width + 2*wall_thickness + 0.30) * (drain_depth + 0.30) - drain_length * (drain_width + 2*wall_thickness + 0.10) * (drain_depth + 0.25)" },
];

// ─── Seed ─────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding depot wizard templates…");

  // 1. Update DM Quarter with Bardoli data
  const dmId = "cmst3u04x000038x9oub17vmn";
  await p.wizardTemplate.update({
    where: { id: dmId },
    data: {
      name: "Depo Manager Quarters (G+1)",
      description: "Bardoli-type G+1 residential quarters with F1/F2/F3 isolated footings, RCC frame, brick masonry walls",
      icon: "🏠",
      buildingType: "RESIDENTIAL",
      parameters: DM_PARAMS,
      boqItemFormulas: DM_BOQ,
      measurementPresets: {
        f1_nos: 8, f1_exc_l: 2.10, f1_exc_b: 2.25, f1_exc_h: 1.50,
        f1_ft_l: 1.80, f1_ft_b: 1.95, f1_ft_h: 0.45,
        f2_nos: 2, f2_exc_l: 2.10, f2_exc_b: 2.40, f2_exc_h: 1.50,
        f2_ft_l: 1.80, f2_ft_b: 2.10, f3_nos: 2,
        f3_exc_l: 2.10, f3_exc_b: 2.10, f3_exc_h: 1.50,
        f3_ft_l: 1.80, f3_ft_b: 1.80,
        col_nos: 12, col_size: 0.23, col_h_gf: 3.20, col_h_ff: 3.00,
        cw_rm: 55, cw_h: 1.80, cw_col_nos: 22, no_of_floors: 2,
      },
    },
  });
  console.log("  ✓ DM Quarter updated with Bardoli data");

  // 2. Upsert Workshop
  await p.wizardTemplate.upsert({
    where: { id: "depot-workshop-001" },
    create: {
      id: "depot-workshop-001",
      name: "Workshop (PEB Roof)",
      description: "Pre-Engineered Building workshop with steel frame, galvalume roofing, brick peripheral walls",
      icon: "🏭",
      buildingType: "CUSTOM",
      parameters: WORKSHOP_PARAMS,
      boqItemFormulas: WORKSHOP_BOQ,
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "Workshop (PEB Roof)",
      description: "Pre-Engineered Building workshop with steel frame, galvalume roofing, brick peripheral walls",
      icon: "🏭",
      parameters: WORKSHOP_PARAMS,
      boqItemFormulas: WORKSHOP_BOQ,
    },
  });
  console.log("  ✓ Workshop template seeded");

  // 3. Upsert OHT
  await p.wizardTemplate.upsert({
    where: { id: "depot-oht-001" },
    create: {
      id: "depot-oht-001",
      name: "Overhead Water Tank (OHT)",
      description: "RCC overhead tank on staging structure with waterproofing",
      icon: "🛢️",
      buildingType: "CUSTOM",
      parameters: OHT_PARAMS,
      boqItemFormulas: OHT_BOQ,
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "Overhead Water Tank (OHT)",
      description: "RCC overhead tank on staging structure with waterproofing",
      icon: "🛢️",
      parameters: OHT_PARAMS,
      boqItemFormulas: OHT_BOQ,
    },
  });
  console.log("  ✓ OHT template seeded");

  // 4. Upsert Toilet Block
  await p.wizardTemplate.upsert({
    where: { id: "depot-toilet-001" },
    create: {
      id: "depot-toilet-001",
      name: "Toilet Block",
      description: "Public/depot toilet block with ceramic tiles, sanitary fixtures, plumbing",
      icon: "🚻",
      buildingType: "CUSTOM",
      parameters: TOILET_PARAMS,
      boqItemFormulas: TOILET_BOQ,
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "Toilet Block",
      description: "Public/depot toilet block with ceramic tiles, sanitary fixtures, plumbing",
      icon: "🚻",
      parameters: TOILET_PARAMS,
      boqItemFormulas: TOILET_BOQ,
    },
  });
  console.log("  ✓ Toilet Block template seeded");

  // 5. Upsert Oil Room
  await p.wizardTemplate.upsert({
    where: { id: "depot-oilroom-001" },
    create: {
      id: "depot-oilroom-001",
      name: "Oil Room / Lubricant Store",
      description: "Depot oil/lubricant store with acid-resistant flooring and oil-proof tiles",
      icon: "🛢️",
      buildingType: "CUSTOM",
      parameters: OIL_PARAMS,
      boqItemFormulas: OIL_BOQ,
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "Oil Room / Lubricant Store",
      description: "Depot oil/lubricant store with acid-resistant flooring and oil-proof tiles",
      icon: "🛢️",
      parameters: OIL_PARAMS,
      boqItemFormulas: OIL_BOQ,
    },
  });
  console.log("  ✓ Oil Room template seeded");

  // 6. Upsert CC Road Yard
  await p.wizardTemplate.upsert({
    where: { id: "depot-ccroad-001" },
    create: {
      id: "depot-ccroad-001",
      name: "CC Road / Depot Yard",
      description: "Plain/reinforced cement concrete road and depot yard pavement with kerb stones",
      icon: "🛣️",
      buildingType: "CUSTOM",
      parameters: CC_ROAD_PARAMS,
      boqItemFormulas: CC_ROAD_BOQ,
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "CC Road / Depot Yard",
      description: "Plain/reinforced cement concrete road and depot yard pavement with kerb stones",
      icon: "🛣️",
      parameters: CC_ROAD_PARAMS,
      boqItemFormulas: CC_ROAD_BOQ,
    },
  });
  console.log("  ✓ CC Road template seeded");

  // 7. Upsert Storm Water Drain
  await p.wizardTemplate.upsert({
    where: { id: "depot-stormwater-001" },
    create: {
      id: "depot-stormwater-001",
      name: "Storm Water Drain",
      description: "RCC covered storm water drain with manholes, plastering and backfill",
      icon: "🌧️",
      buildingType: "CUSTOM",
      parameters: STORM_PARAMS,
      boqItemFormulas: STORM_BOQ,
      isActive: true,
      isUserCreated: false,
    },
    update: {
      name: "Storm Water Drain",
      description: "RCC covered storm water drain with manholes, plastering and backfill",
      icon: "🌧️",
      parameters: STORM_PARAMS,
      boqItemFormulas: STORM_BOQ,
    },
  });
  console.log("  ✓ Storm Water Drain template seeded");

  console.log("\n✅ All depot templates seeded successfully!");
  await p.$disconnect();
}

seed().catch((e) => { console.error(e); p.$disconnect(); process.exit(1); });
