import { headers } from "next/headers";

export async function getDeviceType() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";

  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  
  return {
    isMobile,
    isDesktop: !isMobile
  };
}
