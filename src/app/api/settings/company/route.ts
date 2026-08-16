import { NextResponse } from "next/server";

// Company model removed — use /api/personal-profile instead
export async function GET() {
  return NextResponse.json({ error: "Use /api/personal-profile" }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ error: "Use /api/personal-profile" }, { status: 410 });
}
