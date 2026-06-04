import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopCustomersPage = dynamic(() => import("@/desktop/pages/DesktopCustomersPage"));
const MobileCustomersPage = dynamic(() => import("@/mobile/pages/MobileCustomersPage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

export default async function Page() {
  const { isMobile } = await getDeviceType();
  const PageComponent = isMobile ? MobileCustomersPage : DesktopCustomersPage;
  return (
    <ProtectedRoute>
      <PageComponent />
    </ProtectedRoute>
  );
}
