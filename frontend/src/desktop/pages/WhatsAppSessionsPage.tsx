"use client"

import { useState, useEffect } from "react"
import { 
  Loader2, 
  RefreshCw,
  Trash2,
  XCircle,
  Link2,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])

  const fetchSessions = async () => {
    setIsSyncing(true)
    try {
      const res = await apiFetch("/whatsapp/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    } finally {
      setLoading(false)
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleDeleteSession = async (id: string) => {
    if (!confirm(`Are you sure you want to disconnect and delete the session for ${id === 'meta' ? 'Meta API' : 'WhatsApp Web'}?`)) return
    try {
      const res = await apiFetch(`/whatsapp/sessions/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        alert("Session deleted successfully.")
        await fetchSessions()
      } else {
        alert("Failed to delete session.")
      }
    } catch (err) {
      console.error(err)
      alert("Error deleting session.")
    }
  }

  const handleReconnect = (id: string) => {
    if (id === "meta") {
      router.push("/whatsapp/meta-api")
    } else {
      router.push("/whatsapp/qr")
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
            WhatsApp Sessions Management
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Review active browser nodes and cloud API credentials currently logged in or authenticated to your workspace.
          </p>
        </div>
        <div>
          <Button 
            variant="outline" 
            onClick={fetchSessions}
            disabled={isSyncing}
            className="border-border/50 bg-background/50 backdrop-blur-sm gap-2 text-cyan-400 hover:text-cyan-300"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : <RefreshCw className="h-4 w-4 text-cyan-400" />} 
            Sync Sessions
          </Button>
        </div>
      </div>

      <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white">Active Authentications</CardTitle>
          <CardDescription>
            Lists active Meta Graph API and Baileys socket nodes connected under your credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto rounded-lg border border-border/30 bg-black/40">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase bg-black/60 text-muted-foreground border-b border-border/30">
                <tr>
                  <th scope="col" className="px-6 py-3">Provider</th>
                  <th scope="col" className="px-6 py-3">Connected ID / Number</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Linked Time</th>
                  <th scope="col" className="px-6 py-3">Last Activity</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No active sessions connected. Please link Meta Cloud API or WhatsApp Web QR to begin.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess: any) => (
                    <tr key={sess.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-cyan-400">
                        {sess.provider}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-white">
                        {sess.phoneNumber}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1.5" variant="outline">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(sess.connectedTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(sess.lastActivity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button 
                          onClick={() => handleReconnect(sess.id)}
                          size="sm" 
                          variant="outline"
                          className="border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 gap-1 text-xs"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Reconnect
                        </Button>
                        <Button 
                          onClick={() => handleDeleteSession(sess.id)}
                          size="sm" 
                          variant="outline"
                          className="border-red-500/30 hover:bg-red-500/20 text-red-400 gap-1 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Disconnect
                        </Button>
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
