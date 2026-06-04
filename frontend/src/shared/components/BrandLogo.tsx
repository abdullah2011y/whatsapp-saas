"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * BrandLogo Component
 * Handles theme-based logo switching (Dark/Light)
 * and provides premium cyberpunk animations.
 */
export const BrandLogo = ({ className, size = "md" }: BrandLogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for component to mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("bg-muted animate-pulse rounded-full", className)} />;
  }

  const isDark = resolvedTheme === "dark";
  // Encode space in filename
  const logoSrc = isDark ? "/logo%20white.svg" : "/logo.svg";

  const sizes = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 140, height: 140 },
    xl: { width: 240, height: 240 },
  };

  const currentSize = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      className={cn("flex items-center justify-center group relative", className)}
    >
      {/* Premium Cyberpunk Glow Effect */}
      <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="relative z-10">
        <Image
          src={logoSrc}
          alt="EcoBot Logo"
          width={currentSize.width}
          height={currentSize.height}
          priority
          className={cn(
            "object-contain transition-all duration-500",
            "filter drop-shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]",
            size === "sm" && "max-w-[32px] h-auto",
            size === "md" && "max-w-[48px] h-auto",
            size === "lg" && "max-w-[140px] h-auto",
            size === "xl" && "max-w-[240px] h-auto"
          )}
        />
      </div>
      
      {/* Floating Cyberpunk Micro-animation */}
      <motion.div
        animate={{ 
          y: [0, -3, 0],
          opacity: [0.5, 0.8, 0.5] 
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute -inset-1 border-t border-cyan-500/20 rounded-lg blur-[2px] opacity-0 group-hover:opacity-100 pointer-events-none"
      />
    </motion.div>
  );
};
