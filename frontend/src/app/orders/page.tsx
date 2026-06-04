import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopOrdersPage = dynamic(() => import("@/desktop/pages/DesktopOrdersPage"));
const MobileOrdersPage = dynamic(() => import("@/mobile/pages/MobileOrdersPage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

export default async function Page() {
  const { isMobile } = await getDeviceType();
  const PageComponent = isMobile ? MobileOrdersPage : DesktopOrdersPage;
  return (
    <ProtectedRoute>
      <PageComponent />
    </ProtectedRoute>
  );
}
