import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const userOnly = url.searchParams.get("userOnly") === "true";

  // Only filter by isActive to avoid runtime issues if Prisma client is stale.
  // isUserCreated filtering is done in JS below.
  const templates = await prisma.wizardTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const result = userOnly
    ? templates.filter((t) => (t as Record<string, unknown>).isUserCreated === true)
    : templates;

  // Sort: user-created first, then by name
  result.sort((a, b) => {
    const aU = (a as Record<string, unknown>).isUserCreated ? 1 : 0;
    const bU = (b as Record<string, unknown>).isUserCreated ? 1 : 0;
    if (aU !== bU) return bU - aU;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(result);
}

const paramSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional().default(""),
  dims: z.enum(["n", "l", "b", "h", "d", "lxb", "lxbxh"]).optional(),
});

const boqFormulaSchema = z.object({
  description: z.string().default(""),
  unit: z.string().default(""),
  sorCode: z.string().default(""),
  chapter: z.string().default(""),
  groupHeader: z.string().default(""),
  formula: z.string().default(""),
  sortOrder: z.number().default(0),
});

const measSubRowSchema = z.object({
  subDesc: z.string().default(""),
  nosFormula: z.string().default("1"),
  lengthFormula: z.string().default(""),
  breadthFormula: z.string().default("0"),
  heightFormula: z.string().default("0"),
});

const measFormulaSchema = z.object({
  description: z.string().default(""),
  unit: z.string().default(""),
  gsrtcCode: z.string().default(""),
  rows: z.array(measSubRowSchema).default([]),
  sortOrder: z.number().default(0),
  steelMode: z.boolean().optional().default(false),
});

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  icon: z.string().optional().default("🏗️"),
  parameters: z.array(paramSchema).default([]),
  boqItemFormulas: z.array(boqFormulaSchema).default([]),
  measurementPresets: z.array(measFormulaSchema).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, description, icon, parameters, boqItemFormulas, measurementPresets } = parsed.data;

  const existing = await prisma.wizardTemplate.findFirst({ where: { name } });
  if (existing) return NextResponse.json({ error: "A project type with this name already exists." }, { status: 409 });

  const createData: Record<string, unknown> = {
    name,
    description: description || null,
    icon: icon || "🏗️",
    parameters,
    boqItemFormulas,
    measurementPresets,
    elementConfig: [],
    buildingType: "CUSTOM",
    isUserCreated: true,
  };

  const template = await prisma.wizardTemplate.create({ data: createData as Parameters<typeof prisma.wizardTemplate.create>[0]["data"] });

  return NextResponse.json(template, { status: 201 });
}
