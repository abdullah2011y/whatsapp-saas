import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopLoginPage = dynamic(() => import("@/desktop/pages/DesktopLoginPage"));
const MobileLoginPage = dynamic(() => import("@/mobile/pages/MobileLoginPage"));

export default async function LoginPage() {
  const { isMobile } = await getDeviceType();
  return isMobile ? <MobileLoginPage /> : <DesktopLoginPage />;
}
