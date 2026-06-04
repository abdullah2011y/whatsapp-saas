import dynamic from "next/dynamic";
import { getDeviceType } from "@/shared/lib/device";

const DesktopSignupPage = dynamic(() => import("@/desktop/pages/DesktopSignupPage"));
const MobileSignupPage = dynamic(() => import("@/mobile/pages/MobileSignupPage"));

export default async function SignupPage() {
  const { isMobile } = await getDeviceType();
  return isMobile ? <MobileSignupPage /> : <DesktopSignupPage />;
}
