export const DRAWING_TEMPLATE_OPTIONS = [
  { value: "BUS_STATION", label: "Bus Station / GSRTC" },
  { value: "RESIDENTIAL", label: "Residential Building" },
  { value: "SCHOOL", label: "School Building" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "COMMERCIAL", label: "Commercial Building" },
  { value: "INDUSTRIAL", label: "Industrial Shed" },
  { value: "CUSTOM", label: "Custom / General" },
];

export interface EntityFieldDef {
  key: string;
  label: string;
  unit?: string;
  required?: boolean;
}

export interface EntityTypeDef {
  type: string;
  label: string;
  color: string;
  fields: EntityFieldDef[];
  dynamic: boolean;
}

export const ENTITY_DEFINITIONS: EntityTypeDef[] = [
  {
    type: "BUILDING",
    label: "Building",
    color: "blue",
    dynamic: false,
    fields: [
      { key: "length", label: "Length", unit: "m", required: true },
      { key: "width", label: "Width", unit: "m", required: true },
      { key: "floorCount", label: "Number of Floors" },
      { key: "floorHeight", label: "Floor Height", unit: "m" },
      { key: "plinthArea", label: "Plinth Area", unit: "m²" },
    ],
  },
  {
    type: "ROOM",
    label: "Room / Space",
    color: "green",
    dynamic: true,
    fields: [
      { key: "name", label: "Room Name", required: true },
      { key: "floor", label: "Floor / Level" },
      { key: "length", label: "Length", unit: "m", required: true },
      { key: "width", label: "Width", unit: "m", required: true },
      { key: "height", label: "Height", unit: "m" },
      { key: "area", label: "Area", unit: "m²" },
    ],
  },
  {
    type: "DOOR",
    label: "Door",
    color: "orange",
    dynamic: true,
    fields: [
      { key: "id", label: "Door ID", required: true },
      { key: "type", label: "Type (Flush/Aluminium/FRP)" },
      { key: "width", label: "Width", unit: "mm", required: true },
      { key: "height", label: "Height", unit: "mm", required: true },
      { key: "quantity", label: "Quantity" },
    ],
  },
  {
    type: "WINDOW",
    label: "Window",
    color: "cyan",
    dynamic: true,
    fields: [
      { key: "id", label: "Window ID", required: true },
      { key: "type", label: "Type (Aluminium/UPVC/Steel)" },
      { key: "width", label: "Width", unit: "mm", required: true },
      { key: "height", label: "Height", unit: "mm", required: true },
      { key: "quantity", label: "Quantity" },
    ],
  },
  {
    type: "COLUMN",
    label: "Column",
    color: "purple",
    dynamic: true,
    fields: [
      { key: "id", label: "Column ID", required: true },
      { key: "size", label: "Size (e.g. 300×450 mm)" },
      { key: "floor", label: "Floor" },
      { key: "width", label: "Width", unit: "mm" },
      { key: "depth", label: "Depth", unit: "mm" },
      { key: "quantity", label: "Quantity" },
    ],
  },
  {
    type: "BEAM",
    label: "Beam",
    color: "indigo",
    dynamic: true,
    fields: [
      { key: "id", label: "Beam ID", required: true },
      { key: "size", label: "Size (e.g. 230×450 mm)" },
      { key: "floor", label: "Floor" },
      { key: "span", label: "Span", unit: "m" },
    ],
  },
  {
    type: "FOOTING",
    label: "Footing / Foundation",
    color: "amber",
    dynamic: true,
    fields: [
      { key: "id", label: "Footing ID", required: true },
      { key: "type", label: "Type (Isolated/Strip/Raft)" },
      { key: "length", label: "Length", unit: "m", required: true },
      { key: "width", label: "Width", unit: "m", required: true },
      { key: "depth", label: "Depth", unit: "m", required: true },
      { key: "pccThickness", label: "PCC Thickness", unit: "mm" },
      { key: "excavationDepth", label: "Excavation Depth", unit: "m" },
      { key: "quantity", label: "Quantity" },
    ],
  },
  {
    type: "SLAB",
    label: "Slab",
    color: "slate",
    dynamic: true,
    fields: [
      { key: "floor", label: "Floor", required: true },
      { key: "thickness", label: "Thickness", unit: "mm" },
      { key: "area", label: "Area", unit: "m²" },
      { key: "span", label: "Span", unit: "m" },
    ],
  },
  {
    type: "WALL",
    label: "Wall",
    color: "rose",
    dynamic: true,
    fields: [
      { key: "type", label: "Wall Type (External/Internal)" },
      { key: "thickness", label: "Thickness", unit: "mm" },
      { key: "location", label: "Location / Description" },
      { key: "height", label: "Height", unit: "m" },
    ],
  },
  {
    type: "STAIR",
    label: "Staircase",
    color: "teal",
    dynamic: true,
    fields: [
      { key: "id", label: "Stair ID" },
      { key: "width", label: "Width", unit: "m" },
      { key: "riserCount", label: "Number of Risers" },
      { key: "riserHeight", label: "Riser Height", unit: "mm" },
      { key: "tread", label: "Tread", unit: "mm" },
    ],
  },
];

export function getEntityDef(type: string): EntityTypeDef | undefined {
  return ENTITY_DEFINITIONS.find((e) => e.type === type);
}

export const ENTITY_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  cyan:   { bg: "bg-cyan-50",   text: "text-cyan-700",   border: "border-cyan-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  slate:  { bg: "bg-slate-50",  text: "text-slate-700",  border: "border-slate-200" },
  rose:   { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200" },
};
