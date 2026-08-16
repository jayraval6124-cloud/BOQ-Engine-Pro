import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || file?.name?.replace(/\.[^.]+$/, "") || "Wizard Drawing";

    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    // Find or create a "Wizard Drawings" inbox project for this user
    let inbox = await prisma.project.findFirst({
      where: { name: "Wizard Drawings", createdById: session.user.id },
    });
    if (!inbox) {
      inbox = await prisma.project.create({
        data: {
          projectNo: `WIZ-${Date.now()}`,
          name: "Wizard Drawings",
          sorYear: "2024-25",
          sorDivision: "",
          createdById: session.user.id,
        },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const fileId = randomUUID();
    const fileName = `${fileId}.${ext}`;
    const fileType = ext === "pdf" ? "pdf" : "image";

    const uploadDir = join(process.cwd(), "public", "uploads", "drawings", inbox.id);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), buffer);

    let pageCount = 1;
    if (fileType === "pdf") {
      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
      } catch { pageCount = 1; }
    }

    const drawing = await prisma.drawing.create({
      data: {
        projectId: inbox.id,
        name,
        discipline: "ARCHITECTURAL",
        fileName: file.name,
        filePath: `/uploads/drawings/${inbox.id}/${fileName}`,
        fileType,
        fileSize: buffer.length,
        pageCount,
      },
    });

    return NextResponse.json({ drawingId: drawing.id, projectId: inbox.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
