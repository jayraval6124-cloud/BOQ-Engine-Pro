import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const drawings = await prisma.drawing.findMany({
      where: { projectId },
      include: {
        _count: { select: { entities: true, pages: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(drawings);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string;
    const name = formData.get("name") as string;
    const drawingNo = (formData.get("drawingNo") as string) || null;
    const discipline = (formData.get("discipline") as string) || "ARCHITECTURAL";
    const floor = (formData.get("floor") as string) || null;
    const revision = (formData.get("revision") as string) || null;

    if (!file || !projectId || !name) {
      return NextResponse.json({ error: "file, projectId, name required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const fileId = randomUUID();
    const fileName = `${fileId}.${ext}`;
    const fileType = ext === "pdf" ? "pdf" : "image";

    const uploadDir = join(process.cwd(), "public", "uploads", "drawings", projectId);
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Count PDF pages via pdf-lib (available in dependencies)
    let pageCount = 1;
    if (fileType === "pdf") {
      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
      } catch {
        pageCount = 1;
      }
    }

    const drawing = await prisma.drawing.create({
      data: {
        projectId,
        name,
        drawingNo,
        discipline: discipline as never,
        floor,
        revision,
        fileName: file.name,
        filePath: `/uploads/drawings/${projectId}/${fileName}`,
        fileType,
        fileSize: buffer.length,
        pageCount,
      },
    });

    return NextResponse.json(drawing);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
