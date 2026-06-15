import prisma from "../../config/database";
import { logAction } from "../../shared/services/audit.service";
import { sendEmail } from "../../shared/services/email.service";
import { sendUserWhatsAppNotification } from "../../shared/services/whatsapp-notifier.service";

export async function runSubscriptionMonitorCheck() {
  console.log("[Subscription Monitor] Running daily check...");
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        role: { not: "SUPERADMIN" },
        plan: { not: "Lifetime" },
        expiresAt: { not: null },
      },
    });

    console.log(`[Subscription Monitor] Processing checks for ${users.length} users`);

    for (const user of users) {
      if (!user.expiresAt) continue;

      const expiresDate = new Date(user.expiresAt);
      expiresDate.setHours(0, 0, 0, 0);

      const diffTime = expiresDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      // 1. Expiring warning reminders (7, 3, 1 days remaining)
      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        const message = `Your subscription will expire in ${diffDays} day${diffDays > 1 ? "s" : ""}. Renew now to avoid service interruption.`;
        console.log(`[Subscription Monitor] User ${user.email} is expiring in ${diffDays} days. Triggering notifications...`);

        // Avoid sending duplicate notifications on the same calendar day
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        const existingWarning = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: "EXPIRE_WARNING",
            message: { contains: `${diffDays} day` },
            createdAt: { gte: startOfToday },
          },
        });

        if (!existingWarning) {
          // Dashboard Notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              message,
              type: "EXPIRE_WARNING",
            },
          });

          // Email Notification
          await sendEmail({
            to: user.email,
            subject: `Action Required: Subscription Expiring in ${diffDays} Day${diffDays > 1 ? "s" : ""}`,
            text: message,
          });

          // WhatsApp Notification
          await sendUserWhatsAppNotification(user.id, message);

          await logAction(null, "SUBSCRIPTION_EXPIRING_WARNING", user.id, `Sent ${diffDays}-day expiration warning to user ${user.email}`);
        } else {
          console.log(`[Subscription Monitor] Expiry reminder for ${diffDays} days already sent today to ${user.email}. Skipping.`);
        }
      }

      // 2. Expired subscription checks
      if (diffDays < 0) {
        const daysSinceExpiry = -diffDays;

        if (daysSinceExpiry <= 7) {
          // Inside 7-day Grace Period
          console.log(`[Subscription Monitor] User ${user.email} is in Grace Period (Day ${daysSinceExpiry}/7)`);
          
          // Send "Subscription expired" warning on Day 1 of expiry
          if (daysSinceExpiry === 1) {
            const warningMsg = "Subscription expired. Renew to restore premium features.";
            
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            
            const existingExpiredWarning = await prisma.notification.findFirst({
              where: {
                userId: user.id,
                type: "WARNING",
                message: warningMsg,
                createdAt: { gte: startOfToday },
              },
            });

            if (!existingExpiredWarning) {
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  message: warningMsg,
                  type: "WARNING",
                },
              });

              await sendEmail({
                to: user.email,
                subject: "Subscription Expired",
                text: warningMsg,
              });

              await sendUserWhatsAppNotification(user.id, warningMsg);

              await logAction(null, "SUBSCRIPTION_EXPIRED_WARNING", user.id, `Sent subscription expired warning to user ${user.email}`);
            }
          }
        } else {
          // Grace Period Ended: Archive / Set to INACTIVE
          if (user.status === "ACTIVE") {
            console.log(`[Subscription Monitor] User ${user.email} grace period ended. Transitioning status to INACTIVE...`);
            
            await prisma.user.update({
              where: { id: user.id },
              data: { status: "INACTIVE" },
            });

            await prisma.notification.create({
              data: {
                userId: user.id,
                message: "Subscription expired. Your account is now inactive. Renew to restore premium features.",
                type: "WARNING",
              },
            });

            await sendEmail({
              to: user.email,
              subject: "Account Inactive - Subscription Expired",
              text: "Your subscription grace period has ended. Your account is now inactive. All data remains preserved indefinitely, but premium automations, messages, and pages are locked. Renew your subscription to reactivate.",
            });

            await logAction(null, "ARCHIVE_SUBSCRIPTION", user.id, `User ${user.email} subscription grace period ended. Account archived & status set to INACTIVE.`);
          }
        }
      }
    }
    console.log("[Subscription Monitor] Daily check completed successfully.");
  } catch (error) {
    console.error("[Subscription Monitor] Daily check failed:", error);
  }
}

// Start daily cron check using simple Node timer
export function startSubscriptionScheduler() {
  console.log("[Subscription Scheduler] Starting background timer...");
  
  // Run once immediately on start
  setTimeout(() => {
    runSubscriptionMonitorCheck().catch((err) => {
      console.error("[Subscription Scheduler] Startup check failed:", err);
    });
  }, 5000); // Wait 5s for startup routines to settle

  // Schedule to run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runSubscriptionMonitorCheck().catch((err) => {
      console.error("[Subscription Scheduler] Scheduled check failed:", err);
    });
  }, TWENTY_FOUR_HOURS);
}
