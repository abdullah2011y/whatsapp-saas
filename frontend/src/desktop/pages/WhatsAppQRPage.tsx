"use client"

import { useState, useEffect } from "react"
import { 
  QrCode, 
  Wifi, 
  Loader2, 
  RefreshCw,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Heart
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppQRPage() {
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  
  const [status, setStatus] = useState<any>({
    status: "DISCONNECTED", // DISCONNECTED, CONNECTING, QR, CONNECTED
    connected: false,
    phoneNumber: null,
    lastSync: null,
    sessionHealth: "N/A"
  })

  const fetchStatus = async () => {
    try {
      const res = await apiFetch("/whatsapp/web/status")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp Web status:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchQR = async () => {
    try {
      const res = await apiFetch("/whatsapp/web/qr")
      if (res.ok) {
        const data = await res.json()
        if (data.qr) {
          setQrCodeUrl(data.qr)
        }
        if (data.status) {
          setStatus((prev: any) => ({ ...prev, status: data.status }))
        }
      }
    } catch (err) {
      console.error("Failed to fetch QR:", err)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  // Poll status & QR code during QR or CONNECTING states
  useEffect(() => {
    let intervalId: any = null

    if (status.status === "QR" || status.status === "CONNECTING") {
      fetchQR() // Load immediately
      intervalId = setInterval(() => {
        fetchStatus()
        fetchQR()
      }, 3000)
    } else {
      intervalId = setInterval(() => {
        fetchStatus()
      }, 10000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [status.status])

  const handleConnect = async () => {
    setIsSyncing(true)
    try {
      const res = await apiFetch("/whatsapp/web/connect", {
        method: "POST"
      })
      if (res.ok) {
        setStatus((prev: any) => ({ ...prev, status: "CONNECTING" }))
        // Short timeout to let the backend start
        setTimeout(fetchStatus, 1000)
      } else {
        alert("Failed to initiate WhatsApp Web connection.")
      }
    } catch (err) {
      console.error(err)
      alert("Error initiating WhatsApp Web connection.")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp Web and delete this session?")) return
    setIsSyncing(true)
    try {
      const res = await apiFetch("/whatsapp/web/disconnect", {
        method: "POST"
      })
      if (res.ok) {
        setQrCodeUrl(null)
        setStatus({
          status: "DISCONNECTED",
          connected: false,
          phoneNumber: null,
          lastSync: null,
          sessionHealth: "N/A"
        })
        alert("WhatsApp Web session deleted.")
      } else {
        alert("Failed to disconnect WhatsApp Web.")
      }
    } catch (err) {
      console.error(err)
      alert("Error disconnecting WhatsApp Web.")
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 text-foreground">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
          WhatsApp Web QR Connection
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Scan the QR code to link your phone using our real-time Baileys-based WhatsApp Web provider.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Connection QR Code Panel */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center p-6 min-h-[420px] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.04),transparent)] pointer-events-none" />

            <div className="text-center mb-6 z-10">
              <h3 className="font-bold text-sm text-white">QR Code Scanner Card</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Scan to connect to the WhatsApp Web gateway</p>
            </div>

            {/* QR Code Container */}
            <div className="relative z-10 w-64 h-64 bg-[#0b141a] rounded-xl border border-border/20 shadow-2xl flex items-center justify-center overflow-hidden">
              {status.status === "CONNECTED" && (
                <div className="text-center p-4">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]" />
                  <h4 className="font-bold text-sm text-white mt-4">Linked Successfully</h4>
                  <p className="text-xs text-muted-foreground mt-1">Number: {status.phoneNumber}</p>
                </div>
              )}

              {status.status === "CONNECTING" && (
                <div className="text-center p-4">
                  <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto" />
                  <h4 className="font-bold text-xs text-white mt-4">Booting Instance</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">Acquiring authentication state...</p>
                </div>
              )}

              {status.status === "QR" && qrCodeUrl ? (
                <div className="relative p-2 bg-white rounded-lg group shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                  <img src={qrCodeUrl} alt="WhatsApp Web QR Code" className="w-56 h-56 block select-none" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-2 rounded-lg">
                    <p className="text-xs text-white font-semibold">Scan with Linked Devices in WhatsApp</p>
                  </div>
                </div>
              ) : (
                status.status === "QR" && (
                  <div className="text-center p-4">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Generating QR code...</p>
                  </div>
                )
              )}

              {status.status === "DISCONNECTED" && (
                <div className="text-center p-4">
                  <QrCode className="w-16 h-16 text-muted-foreground mx-auto" />
                  <h4 className="font-bold text-xs text-muted-foreground mt-4">No active session</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">Click the button below to link device</p>
                </div>
              )}
            </div>

            {/* QR Connection Controls */}
            <div className="w-full max-w-[256px] z-10 mt-6 flex flex-col gap-2">
              {status.status === "DISCONNECTED" && (
                <Button 
                  onClick={handleConnect} 
                  disabled={isSyncing}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Generate QR Code
                </Button>
              )}

              {status.status === "QR" && (
                <Button 
                  onClick={handleConnect} 
                  disabled={isSyncing}
                  className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Regenerate QR
                </Button>
              )}

              {status.status !== "DISCONNECTED" && (
                <Button 
                  onClick={handleDisconnect} 
                  disabled={isSyncing}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Disconnect Session
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Connection details Panel */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Session Information</CardTitle>
              <CardDescription>Details of your current WhatsApp Web link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                  <p className="text-xs text-gray-500 mb-1">Session Status</p>
                  <p className={`text-sm font-bold capitalize ${status.connected ? 'text-green-400' : 'text-red-400'}`}>
                    {status.status.toLowerCase()}
                  </p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                  <p className="text-xs text-gray-500 mb-1">Connected JID</p>
                  <p className="text-sm font-medium text-white truncate">{status.phoneNumber || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                  <p className="text-xs text-gray-500 mb-1">Last Synced At</p>
                  <p className="text-sm font-medium text-white">
                    {status.lastSync ? new Date(status.lastSync).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                  <p className="text-xs text-gray-500 mb-1">Connection Health</p>
                  <p className={`text-sm font-bold flex items-center gap-1.5 ${status.connected ? 'text-green-400' : 'text-gray-400'}`}>
                    <Heart className={`w-3.5 h-3.5 ${status.connected ? 'fill-green-400 animate-pulse text-green-400' : ''}`} />
                    {status.sessionHealth}
                  </p>
                </div>
              </div>

              {/* Guide Setup */}
              <div className="border-t border-border/20 pt-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">How to Link WhatsApp Web:</h5>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>Click the **Generate QR Code** button to spawn a session token.</li>
                  <li>Wait for the QR code matrix to render.</li>
                  <li>Open **WhatsApp** on your phone.</li>
                  <li>Tap **Menu** (three dots) or **Settings** &gt; **Linked Devices** &gt; **Link a Device**.</li>
                  <li>Point your phone's camera at the screen and scan the QR code.</li>
                  <li>The session will authenticate, sync messages, and transition to **Connected** status automatically.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
