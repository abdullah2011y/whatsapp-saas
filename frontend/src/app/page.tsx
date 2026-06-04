import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopDashboardPage = dynamic(() => import("@/desktop/pages/DesktopDashboardPage"));
const MobileDashboardPage = dynamic(() => import("@/mobile/pages/MobileDashboardPage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

export default async function Page() {
  const { isMobile } = await getDeviceType();
  const PageComponent = isMobile ? MobileDashboardPage : DesktopDashboardPage;
  return (
    <ProtectedRoute>
      <PageComponent />
    </ProtectedRoute>
  );
}
