import { NextResponse } from "next/server";
import { checkOllamaStatus, getAISettings } from "@/lib/ollama";

export async function GET() {
  try {
    const settings = await getAISettings();
    const status = await checkOllamaStatus(settings);
    return NextResponse.json({ ...status, settings });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }
}
