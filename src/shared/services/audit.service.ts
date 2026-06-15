import prisma from "../../config/database";

export async function logAction(
  userId: string | null,
  action: string,
  targetId: string | null = null,
  details: string | null = null
) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId,
        details,
      },
    });
    console.log(`[AuditLog] ${action} logged for user: ${userId || "SYSTEM"}. Details: ${details || "None"}`);
    return log;
  } catch (error) {
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}
