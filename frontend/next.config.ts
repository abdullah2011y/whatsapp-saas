import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WHATSAPP_MODULE_ENABLED: process.env.WHATSAPP_MODULE_ENABLED || "true",
  }
};

export default nextConfig;
