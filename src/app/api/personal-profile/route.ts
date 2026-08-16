import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  firmName: z.string().min(1).optional(),
  engineerName: z.string().optional(),
  designation: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gst: z.string().optional(),
  registrationNo: z.string().optional(),
  logoPath: z.string().optional(),
  stampPath: z.string().optional(),
  signaturePath: z.string().optional(),
  defaultDistrict: z.string().optional(),
  defaultSORYear: z.string().optional(),
  boqHeaderNote: z.string().optional(),
  boqFooterNote: z.string().optional(),
  dtpHeaderHtml: z.string().optional(),
  dtpFooterHtml: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let profile = await prisma.personalProfile.findFirst({ where: { userId: session.user.id } });

  if (!profile) {
    profile = await prisma.personalProfile.create({
      data: {
        userId: session.user.id,
        firmName: session.user.name || "My Firm",
        engineerName: session.user.name || "",
      },
    });
  }

  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const profile = await prisma.personalProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  await logAudit({
    userId: session.user.id,
    action: "PROFILE_UPDATED",
    entity: "PersonalProfile",
    entityId: profile.id,
    description: "Personal profile updated",
  });

  return NextResponse.json(profile);
}
