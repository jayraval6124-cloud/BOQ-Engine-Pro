import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(num: number | string, decimals = 3): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0.000";
  return n.toFixed(decimals);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function generateProjectNo(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `PRJ-${year}-${seq}`;
}

export function generateBOQNo(projectNo: string, revNo = 1): string {
  return `${projectNo}-BOQ-R${revNo.toString().padStart(2, "0")}`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const DISTRICTS_GUJARAT = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha",
  "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod",
  "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath",
  "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar",
  "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
  "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat",
  "Surendranagar", "Tapi", "Vadodara", "Valsad",
];

export const DIVISIONS_GUJARAT = [
  "Ahmedabad", "Amreli", "Bharuch", "Bhavnagar", "Bhuj",
  "Godhara", "Himmatnagar", "Jamnagar", "Junagadh", "Mehsana",
  "Nadiad", "Palanpur", "Rajkot", "Surat", "Vadodara", "Valsad",
];

export const SOR_YEARS = [
  "2024-25", "2023-24", "2022-23", "2021-22", "2020-21",
];

export const WORK_TYPES = {
  NEW_CONSTRUCTION: "New Construction",
  RENOVATION: "Renovation",
  REPAIR: "Repair",
  MAINTENANCE: "Maintenance",
  DEMOLITION: "Demolition",
  SURVEY: "Survey",
};

export const BUILDING_TYPES = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
  INSTITUTIONAL: "Institutional",
  INFRASTRUCTURE: "Infrastructure",
  MIXED_USE: "Mixed Use",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const BOQ_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  LOCKED: "Locked",
  REVISED: "Revised",
};
