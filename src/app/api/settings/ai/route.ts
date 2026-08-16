import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.aISettings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(
      settings ?? {
        id: "singleton",
        provider: "ollama",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "qwen2.5:7b",
        ollamaVisionModel: "qwen2.5:7b",
        ollamaTimeout: 120,
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, ollamaUrl, ollamaModel, ollamaVisionModel, ollamaTimeout } = body;
    const settings = await prisma.aISettings.upsert({
      where: { id: "singleton" },
      update: { provider, ollamaUrl, ollamaModel, ollamaVisionModel, ollamaTimeout: Number(ollamaTimeout) },
      create: {
        id: "singleton",
        provider: provider ?? "ollama",
        ollamaUrl: ollamaUrl ?? "http://localhost:11434",
        ollamaModel: ollamaModel ?? "qwen2.5:7b",
        ollamaVisionModel: ollamaVisionModel ?? "qwen2.5:7b",
        ollamaTimeout: Number(ollamaTimeout ?? 300),
      },
    });
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
