import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopAnalyticsPage = dynamic(() => import("@/desktop/pages/DesktopAnalyticsPage"));
const MobileAnalyticsPage = dynamic(() => import("@/mobile/pages/MobileAnalyticsPage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

export default async function Page() {
  const { isMobile } = await getDeviceType();
  const PageComponent = isMobile ? MobileAnalyticsPage : DesktopAnalyticsPage;
  return (
    <ProtectedRoute>
      <PageComponent />
    </ProtectedRoute>
  );
}
