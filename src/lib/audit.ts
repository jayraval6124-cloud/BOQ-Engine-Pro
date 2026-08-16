import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

interface AuditParams {
  userId: string;
  projectId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        projectId: params.projectId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValues: params.oldValues as never ?? undefined,
        newValues: params.newValues as never ?? undefined,
        description: params.description,
        ipAddress: params.ipAddress,
      },
    });
  } catch {
    console.error("Failed to write audit log");
  }
}
