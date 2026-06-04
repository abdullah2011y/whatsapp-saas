import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopCustomerProfilePage = dynamic(() => import("@/desktop/pages/DesktopCustomerProfilePage"));
const MobileCustomerProfilePage = dynamic(() => import("@/mobile/pages/MobileCustomerProfilePage"));
const ProtectedRoute = dynamic(() => import("@/shared/lib/ProtectedRoute").then(m => m.ProtectedRoute));

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const { isMobile } = await getDeviceType();
  const PageComponent = isMobile ? MobileCustomerProfilePage : DesktopCustomerProfilePage;
  
  return (
    <ProtectedRoute>
      <PageComponent customerId={id} />
    </ProtectedRoute>
  );
}
