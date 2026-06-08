"use client"

import { useState, useEffect } from "react"
import { 
  Wifi, 
  Settings, 
  MessageSquare, 
  Loader2, 
  RefreshCw,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [data, setData] = useState<any>({
    metaConnected: false,
    qrConnected: false,
    qrStatus: "DISCONNECTED",
    connectedNumber: null,
    defaultProvider: "ASK",
    templatesCount: 0,
    automationsCount: 0,
    recentActivity: []
  })

  const fetchOverview = async () => {
    setIsSyncing(true)
    try {
      const res = await apiFetch("/whatsapp/overview")
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (err) {
      console.error("Failed to fetch overview data:", err)
    } finally {
      setLoading(false)
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    fetchOverview()
    // Auto-poll status every 10 seconds
    const interval = setInterval(fetchOverview, 10000)
    return () => clearInterval(interval)
  }, [])

  const getProviderName = (code: string) => {
    if (code === "META") return "Meta Cloud API"
    if (code === "WEB") return "WhatsApp Web (Baileys)"
    return "Ask Every Time"
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
            WhatsApp Dashboard Overview
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time status of your API gateways, connections, and automated notification activity.
          </p>
        </div>
        <div>
          <Button 
            variant="outline" 
            onClick={fetchOverview}
            disabled={isSyncing}
            className="border-border/50 bg-background/50 backdrop-blur-sm gap-2 text-cyan-400 hover:text-cyan-300"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : <RefreshCw className="h-4 w-4 text-cyan-400" />} 
            Sync Status
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Meta Cloud API */}
        <Card className={`bg-black/30 backdrop-blur-md border-border/40 transition-all ${data.metaConnected ? 'shadow-[0_0_15px_rgba(74,222,128,0.05)] border-green-500/30' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta Cloud API</CardTitle>
            <span className={`w-2.5 h-2.5 rounded-full ${data.metaConnected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.metaConnected ? 'text-green-400' : 'text-red-400'}`}>
              {data.metaConnected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official cloud connection state
            </p>
          </CardContent>
        </Card>

        {/* WhatsApp Web (Baileys) */}
        <Card className={`bg-black/30 backdrop-blur-md border-border/40 transition-all ${data.qrConnected ? 'shadow-[0_0_15px_rgba(74,222,128,0.05)] border-green-500/30' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Web (Baileys)</CardTitle>
            <span className={`w-2.5 h-2.5 rounded-full ${
              data.qrStatus === "CONNECTED" ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : 
              data.qrStatus === "QR" ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" : 
              data.qrStatus === "CONNECTING" ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" :
              "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
            }`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.qrStatus === "CONNECTED" ? "text-green-400" : 
              data.qrStatus === "QR" ? "text-yellow-400" : 
              data.qrStatus === "CONNECTING" ? "text-blue-400" :
              "text-red-400"
            }`}>
              {data.qrStatus === "CONNECTED" ? "Connected" : 
               data.qrStatus === "QR" ? "QR Code Ready" :
               data.qrStatus === "CONNECTING" ? "Connecting..." :
               "Disconnected"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Session state: {data.qrStatus}
            </p>
          </CardContent>
        </Card>

        {/* Active Phone Number */}
        <Card className="bg-black/30 backdrop-blur-md border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Number</CardTitle>
            <Smartphone className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white truncate">
              {data.connectedNumber || "No number active"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active WhatsApp contact node
            </p>
          </CardContent>
        </Card>

        {/* Default Provider */}
        <Card className="bg-black/30 backdrop-blur-md border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Provider</CardTitle>
            <Wifi className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {getProviderName(data.defaultProvider)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active configuration for messages dispatch
            </p>
          </CardContent>
        </Card>

        {/* Templates Count */}
        <Card className="bg-black/30 backdrop-blur-md border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates Count</CardTitle>
            <MessageSquare className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.templatesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Custom template notifications saved
            </p>
          </CardContent>
        </Card>

        {/* Automations Count */}
        <Card className="bg-black/30 backdrop-blur-md border-border/40 shadow-[0_0_15px_rgba(0,240,255,0.02)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Automations</CardTitle>
            <Settings className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.automationsCount} / 6</div>
            <p className="text-xs text-muted-foreground mt-1">
              Live automated transition handlers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Recent Automation Actions</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Latest orders synced and confirmation outcomes dispatched.
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto rounded-lg border border-border/30 bg-black/40">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase bg-black/60 text-muted-foreground border-b border-border/30">
                <tr>
                  <th scope="col" className="px-6 py-3">Order</th>
                  <th scope="col" className="px-6 py-3">Customer</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      No recent automation logs found.
                    </td>
                  </tr>
                ) : (
                  data.recentActivity.map((act: any) => (
                    <tr key={act.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-cyan-400">
                        {act.orderName || `#${act.id.slice(0, 8)}`}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">{act.customer}</td>
                      <td className="px-6 py-4">
                        {act.status === "CONFIRMED" && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1.5" variant="outline">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                          </Badge>
                        )}
                        {act.status === "CANCELLED" && (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5" variant="outline">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </Badge>
                        )}
                        {act.status === "PENDING" && (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1.5" variant="outline">
                            <Clock className="w-3 h-3" /> Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(act.time).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
