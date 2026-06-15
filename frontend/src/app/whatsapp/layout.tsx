"use client"
import * as React from "react"
import { LicenseGuard } from "@/shared/components/LicenseGuard"
import { ProtectedRoute } from "@/shared/lib/ProtectedRoute"

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <LicenseGuard>
        {children}
      </LicenseGuard>
    </ProtectedRoute>
  )
}
