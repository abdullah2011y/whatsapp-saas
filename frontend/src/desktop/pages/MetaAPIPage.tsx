"use client"

import { useState, useEffect } from "react"
import { 
  Wifi, 
  Loader2, 
  Save, 
  Play, 
  Trash2,
  Copy,
  Check,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { apiFetch } from "@/shared/lib/api/client"

export default function MetaAPIPage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const [form, setForm] = useState({
    businessAccountId: "",
    phoneNumberId: "",
    verifyToken: "",
    accessToken: "",
    connected: false
  })

  // Determine webhook URL based on window environment
  const getWebhookUrl = () => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost";
      const host = isLocal ? "http://localhost:5000" : window.location.origin.replace("frontend", "backend");
      // Fallback
      return `${host.replace(":3000", ":5000")}/webhook`;
    }
    return "/webhook";
  }

  const fetchStatus = async () => {
    try {
      const res = await apiFetch("/whatsapp/meta/status")
      if (res.ok) {
        const data = await res.json()
        setForm({
          businessAccountId: data.businessAccountId || "",
          phoneNumberId: data.phoneNumberId || "",
          verifyToken: data.verifyToken || "",
          accessToken: data.accessToken || "",
          connected: data.connected || false
        })
      }
    } catch (err) {
      console.error("Failed to fetch Meta API status:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const copyToClipboard = (text: string, type: "url" | "token") => {
    navigator.clipboard.writeText(text)
    if (type === "url") {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phoneNumberId) {
      alert("Phone Number ID is required.")
      return
    }
    setIsSaving(true)
    setTestResult(null)
    try {
      const res = await apiFetch("/whatsapp/meta/save", {
        method: "POST",
        body: JSON.stringify({
          businessAccountId: form.businessAccountId,
          phoneNumberId: form.phoneNumberId,
          accessToken: form.accessToken,
          verifyToken: form.verifyToken
        })
      })
      if (res.ok) {
        alert("Meta API credentials saved successfully!")
        await fetchStatus()
      } else {
        alert("Failed to save credentials.")
      }
    } catch (err) {
      console.error(err)
      alert("Error saving Meta API credentials.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await apiFetch("/whatsapp/meta/test", {
        method: "POST"
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult({ success: true, message: "Connected successfully! Meta Cloud API is verified." })
        setForm(prev => ({ ...prev, connected: true }))
      } else {
        setTestResult({ success: false, message: data.error || "Connection failed. Please verify credentials." })
        setForm(prev => ({ ...prev, connected: false }))
      }
    } catch (err) {
      console.error(err)
      setTestResult({ success: false, message: "Network error. Failed to perform Graph API connection check." })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect and delete Meta API configurations?")) return
    setIsDisconnecting(true)
    setTestResult(null)
    try {
      const res = await apiFetch("/whatsapp/meta/disconnect", {
        method: "POST"
      })
      if (res.ok) {
        alert("Meta API disconnected.")
        setForm({
          businessAccountId: "",
          phoneNumberId: "",
          verifyToken: "",
          accessToken: "",
          connected: false
        })
      } else {
        alert("Failed to disconnect.")
      }
    } catch (err) {
      console.error(err)
      alert("Error disconnecting Meta API.")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  const webhookUrl = getWebhookUrl();

  return (
    <div className="flex-1 space-y-6 text-foreground">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
          Meta WhatsApp Cloud API Configuration
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure Meta Graph API credentials to leverage WhatsApp interactive confirmation buttons.
        </p>
      </div>

      {/* Connection Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
        form.connected 
          ? "bg-green-500/10 border-green-500/30 text-green-400" 
          : "bg-red-500/10 border-red-500/30 text-red-400"
      }`}>
        <div className="flex items-center gap-3">
          <Wifi className={`w-5 h-5 ${form.connected ? 'animate-pulse text-green-400' : 'text-red-400'}`} />
          <div>
            <h4 className="font-bold text-sm">
              {form.connected ? "Gateway Online & Connected" : "Gateway Offline / Disconnected"}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {form.connected 
                ? "Your Meta Cloud API configuration has been verified and is active." 
                : "Please fill in credentials and test connection to activate."}
            </p>
          </div>
        </div>
        <div className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded bg-black/40 border border-current">
          {form.connected ? "Active" : "Inactive"}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Credentials Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white font-mono uppercase tracking-wider text-cyan-400">Credentials Setup</CardTitle>
              <CardDescription>Enter Meta Developer console app details below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business Account ID</label>
                <Input
                  placeholder="e.g. 104782012019992"
                  value={form.businessAccountId}
                  onChange={(e) => setForm(prev => ({ ...prev, businessAccountId: e.target.value }))}
                  className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number ID <span className="text-red-500">*</span></label>
                <Input
                  required
                  placeholder="e.g. 1101114076422800"
                  value={form.phoneNumberId}
                  onChange={(e) => setForm(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">Verify Token</label>
                <Input
                  placeholder="e.g. my_custom_verify_token"
                  value={form.verifyToken}
                  onChange={(e) => setForm(prev => ({ ...prev, verifyToken: e.target.value }))}
                  className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Token</label>
                <Input
                  placeholder={form.accessToken ? "**************** (Saved)" : "Enter Access Token"}
                  value={form.accessToken}
                  onChange={(e) => setForm(prev => ({ ...prev, accessToken: e.target.value }))}
                  className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Permanent access token generated under your Meta app's system user.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/20">
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold flex-1"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Credentials
                </Button>
                
                <Button 
                  type="button" 
                  onClick={handleTestConnection}
                  disabled={isTesting || !form.phoneNumberId}
                  className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black border border-green-500/30 font-bold flex-1"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>

                {form.connected && (
                  <Button 
                    type="button" 
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold"
                  >
                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Outcomes */}
          {testResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              testResult.success 
                ? "bg-green-500/10 border-green-500/25 text-green-400" 
                : "bg-red-500/10 border-red-500/25 text-red-400"
            }`}>
              {testResult.success ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <h5 className="font-semibold text-sm">{testResult.success ? "Test Successful" : "Test Connection Failed"}</h5>
                <p className="text-xs opacity-90 mt-1 font-mono leading-relaxed break-all">
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Guides Panel */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Meta Webhook Setup</CardTitle>
              <CardDescription>Configure Meta Webhook using these values.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Webhook Callback URL</label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={webhookUrl}
                    className="bg-black/40 border-border/40 font-mono text-xs flex-1 select-all"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(webhookUrl, "url")}
                    className="border-border/40 hover:bg-accent/40"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Verify Token</label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={form.verifyToken || "byteforge_verify"}
                    className="bg-black/40 border-border/40 font-mono text-xs flex-1 select-all"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(form.verifyToken || "byteforge_verify", "token")}
                    className="border-border/40 hover:bg-accent/40"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/20 pt-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
                <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Setup Guidelines:</h5>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Log in to the <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Meta Developer Console</a>.</li>
                  <li>Select your app and navigate to **WhatsApp** &gt; **Configuration**.</li>
                  <li>Click **Edit** in the Webhook section.</li>
                  <li>Paste the **Callback URL** and **Verify Token** displayed above.</li>
                  <li>Click **Verify and Save**.</li>
                  <li>Subscribe to the **messages** webhook topic to process responses.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
