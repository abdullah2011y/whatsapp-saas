import dynamic from "next/dynamic";
import { WHATSAPP_MODULE_ENABLED } from "@/shared/config/features";
import { WhatsAppComingSoon } from "@/shared/components/WhatsAppComingSoon";

const DesktopComponent = dynamic(() => import("@/desktop/pages/WhatsAppTemplatesPage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

export default async function Page() {
  if (!WHATSAPP_MODULE_ENABLED) {
    return (
      <ProtectedRoute>
        <WhatsAppComingSoon />
      </ProtectedRoute>
    );
  }
  return (
    <ProtectedRoute>
      <DesktopComponent />
    </ProtectedRoute>
  );
}
