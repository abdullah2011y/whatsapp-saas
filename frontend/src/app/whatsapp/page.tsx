import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";
import { WHATSAPP_MODULE_ENABLED } from "@/shared/config/features";
import { WhatsAppComingSoon } from "@/shared/components/WhatsAppComingSoon";

const DesktopWhatsAppPage = dynamic(() => import("@/desktop/pages/DesktopWhatsAppPage"));
const MobileWhatsAppPage = dynamic(() => import("@/mobile/pages/MobileWhatsAppPage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

export default async function Page() {
  const { isMobile } = await getDeviceType();
  
  // Feature flag check: render Coming Soon if WhatsApp Automation is disabled
  if (!WHATSAPP_MODULE_ENABLED) {
    return (
      <ProtectedRoute>
        <WhatsAppComingSoon />
      </ProtectedRoute>
    );
  }

  const PageComponent = isMobile ? MobileWhatsAppPage : DesktopWhatsAppPage;
  return (
    <ProtectedRoute>
      <PageComponent />
    </ProtectedRoute>
  );
}
