"use client"

import { useState, useEffect } from "react"
import { 
  Loader2, 
  Save, 
  Settings,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Play,
  Globe
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [overview, setOverview] = useState<{
    metaConnected: boolean
    qrConnected: boolean
    qrStatus: string
    sessionHealth: string
    connectedNumber: string | null
  } | null>(null)

  const [form, setForm] = useState({
    enabledProviders: "BOTH", // META, WEB, BOTH
    defaultProvider: "META",    // META, WEB
    confirmationMethod: "BUTTONS", // BUTTONS, POLLS, CUSTOM
    pollConfirmLabel: "✅ Yes Confirmed",
    pollCancelLabel: "❌ No Cancelled",
    shopifyDomain: "",
    verifyToken: ""
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

  const webhookUrl = getWebhookUrl();

  const fetchOverview = async () => {
    try {
      const res = await apiFetch("/whatsapp/overview")
      if (res.ok) {
        const data = await res.json()
        setOverview({
          metaConnected: data.metaConnected || false,
          qrConnected: data.qrConnected || false,
          qrStatus: data.qrStatus || "disconnected",
          sessionHealth: data.sessionHealth || "N/A",
          connectedNumber: data.connectedNumber || null
        })
      }
    } catch (err) {
      console.error("Failed to fetch overview:", err)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/whatsapp/settings")
      if (res.ok) {
        const data = await res.json()
        const dbDefaultProvider = data.defaultProvider || "META"
        setForm({
          enabledProviders: data.enabledProviders || "BOTH",
          defaultProvider: dbDefaultProvider === "ASK" ? "META" : dbDefaultProvider,
          confirmationMethod: data.confirmationMethod || "BUTTONS",
          pollConfirmLabel: data.pollConfirmLabel || "✅ Yes Confirmed",
          pollCancelLabel: data.pollCancelLabel || "❌ No Cancelled",
          shopifyDomain: data.shopifyDomain || "",
          verifyToken: data.verifyToken || ""
        })
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchOverview()
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

  const handleRegenerateToken = async () => {
    setIsRegeneratingToken(true)
    setWebhookTestResult(null)
    try {
      const res = await apiFetch("/whatsapp/webhook/regenerate-token", {
        method: "POST"
      })
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({ ...prev, verifyToken: data.verifyToken }))
        alert("Verify token regenerated! Save settings to apply.")
      } else {
        alert("Failed to regenerate verify token.")
      }
    } catch (err) {
      console.error(err)
      alert("Error regenerating verify token.")
    } finally {
      setIsRegeneratingToken(false)
    }
  }

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const res = await apiFetch("/whatsapp/webhook/test", {
        method: "POST"
      })
      const data = await res.json()
      if (res.ok) {
        setWebhookTestResult({ success: true, message: data.message || "Webhook verification loopback test succeeded!" })
      } else {
        setWebhookTestResult({ success: false, message: data.error || "Webhook loopback test failed." })
      }
    } catch (err) {
      console.error(err)
      setWebhookTestResult({ success: false, message: "Network error. Failed to run loopback webhook test." })
    } finally {
      setIsTestingWebhook(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await apiFetch("/whatsapp/settings", {
        method: "POST",
        body: JSON.stringify(form)
      })
      if (res.ok) {
        alert("Settings saved successfully!")
        await fetchSettings()
        await fetchOverview()
      } else {
        alert("Failed to save settings.")
      }
    } catch (err) {
      console.error(err)
      alert("Error saving settings.")
    } finally {
      setIsSaving(false)
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
          WhatsApp System Settings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Adjust provider options, defaults, interactive confirmation elements, and Shopify tenant configurations.
        </p>
      </div>

      {/* Gateway Status Indicators */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Meta API Status */}
        <Card className="bg-black/20 border-border/40 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-cyan-500/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Meta Cloud API</p>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${overview?.metaConnected ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
                <h4 className="text-sm font-bold text-white">
                  {overview?.metaConnected ? "Online" : "Offline"}
                </h4>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Web Status */}
        <Card className="bg-black/20 border-border/40 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-cyan-500/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">WhatsApp Web QR</p>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${overview?.qrConnected ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
                <h4 className="text-sm font-bold text-white">
                  {overview?.qrConnected ? "Online" : "Offline"}
                </h4>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Number */}
        <Card className="bg-black/20 border-border/40 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-cyan-500/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="space-y-1 w-full">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Connected Number</p>
              <h4 className="text-sm font-bold text-cyan-400 font-mono truncate" title={overview?.connectedNumber || undefined}>
                {overview?.connectedNumber || "None"}
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* Session Health */}
        <Card className="bg-black/20 border-border/40 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-cyan-500/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Session Health</p>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  overview?.sessionHealth === "Healthy" 
                    ? "bg-green-500 shadow-[0_0_8px_#22c55e]" 
                    : overview?.sessionHealth === "Unhealthy"
                    ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                    : "bg-gray-500 shadow-[0_0_8px_#6b7280]"
                }`} />
                <h4 className="text-sm font-bold text-white">
                  {overview?.sessionHealth || "N/A"}
                </h4>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* Provider Selection */}
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" /> Gateway & Provider Control
              </CardTitle>
              <CardDescription>Select which WhatsApp connections are allowed and set defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enabled Providers */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Enabled Providers</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.enabledProviders === 'META' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="enabledProviders" 
                      value="META"
                      checked={form.enabledProviders === 'META'}
                      onChange={(e) => setForm(prev => ({ ...prev, enabledProviders: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Meta API Only</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Send confirmations solely using the cloud Graph API.</span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.enabledProviders === 'WEB' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="enabledProviders" 
                      value="WEB"
                      checked={form.enabledProviders === 'WEB'}
                      onChange={(e) => setForm(prev => ({ ...prev, enabledProviders: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">WhatsApp Web Only</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Connect device and broadcast via Baileys QR protocol.</span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.enabledProviders === 'BOTH' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="enabledProviders" 
                      value="BOTH"
                      checked={form.enabledProviders === 'BOTH'}
                      onChange={(e) => setForm(prev => ({ ...prev, enabledProviders: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Both Providers</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Enable both API and browser nodes side-by-side.</span>
                  </label>
                </div>
              </div>

              {/* Default Provider */}
              <div className="space-y-3 border-t border-border/20 pt-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Default Routing Provider</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.defaultProvider === 'META' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="defaultProvider" 
                      value="META"
                      checked={form.defaultProvider === 'META'}
                      onChange={(e) => setForm(prev => ({ ...prev, defaultProvider: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Meta API</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Default to official confirmation button flows.</span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.defaultProvider === 'WEB' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="defaultProvider" 
                      value="WEB"
                      checked={form.defaultProvider === 'WEB'}
                      onChange={(e) => setForm(prev => ({ ...prev, defaultProvider: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">WhatsApp Web</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Default to poll-based web configurations.</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Flow Preferences */}
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Confirmation Customization</CardTitle>
              <CardDescription>Tailor labels and response methods for interactive flows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Method Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Order Confirmation Method</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.confirmationMethod === 'BUTTONS' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="confirmationMethod" 
                      value="BUTTONS"
                      checked={form.confirmationMethod === 'BUTTONS'}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmationMethod: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Button Reply</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Deploy official interactive quick reply buttons.</span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.confirmationMethod === 'POLLS' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="confirmationMethod" 
                      value="POLLS"
                      checked={form.confirmationMethod === 'POLLS'}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmationMethod: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">WhatsApp Polls</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Send a poll selection box to request votes.</span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.confirmationMethod === 'CUSTOM' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="confirmationMethod" 
                      value="CUSTOM"
                      checked={form.confirmationMethod === 'CUSTOM'}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmationMethod: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Custom Flow</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Configure external links or customized web hooks.</span>
                  </label>
                </div>
              </div>

              {/* Poll Labels */}
              <div className="grid gap-4 sm:grid-cols-2 border-t border-border/20 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poll Confirm Option Label</label>
                  <Input 
                    value={form.pollConfirmLabel}
                    onChange={(e) => setForm(prev => ({ ...prev, pollConfirmLabel: e.target.value }))}
                    className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poll Cancel Option Label</label>
                  <Input 
                    value={form.pollCancelLabel}
                    onChange={(e) => setForm(prev => ({ ...prev, pollCancelLabel: e.target.value }))}
                    className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration Section */}
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Webhook settings
              </CardTitle>
              <CardDescription>Configure external integrations and inspect webhook loopback status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={webhookUrl}
                    className="bg-black/40 border-border/40 font-mono text-xs flex-1 select-all"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(webhookUrl, "url")}
                    className="border-border/40 hover:bg-accent/40 shrink-0"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  </Button>
                </div>
              </div>

              {/* Webhook Verify Token */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Webhook Verify Token</label>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Verify Token (e.g. byteforge_verify)"
                    value={form.verifyToken}
                    onChange={(e) => setForm(prev => ({ ...prev, verifyToken: e.target.value }))}
                    className="bg-black/40 border-border/40 font-mono text-xs flex-1"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(form.verifyToken, "token")}
                    disabled={!form.verifyToken}
                    className="border-border/40 hover:bg-accent/40 shrink-0"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRegenerateToken}
                    disabled={isRegeneratingToken}
                    className="border-border/40 hover:bg-accent/40 text-xs shrink-0"
                  >
                    {isRegeneratingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Test Webhook Connection */}
              <div className="border-t border-border/20 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Webhook Connection Test</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Test local verify token validation loops.</p>
                </div>
                <Button 
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook || !form.verifyToken}
                  className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black border border-green-500/30 font-bold px-4 py-2 text-xs"
                >
                  {isTestingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />}
                  Connection Test
                </Button>
              </div>

              {/* Webhook Test Outcomes */}
              {webhookTestResult && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 ${
                  webhookTestResult.success 
                    ? "bg-green-500/10 border-green-500/25 text-green-400" 
                    : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}>
                  {webhookTestResult.success ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div>
                    <h5 className="font-semibold text-sm">{webhookTestResult.success ? "Loopback Success" : "Loopback Verification Failed"}</h5>
                    <p className="text-xs opacity-90 mt-1 font-mono leading-relaxed break-all">
                      {webhookTestResult.message}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tenant configurations */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Store Connection</CardTitle>
              <CardDescription>Connect Shopify store hooks to this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shopify Store Domain</label>
                <Input 
                  placeholder="e.g. mystore.myshopify.com"
                  value={form.shopifyDomain}
                  onChange={(e) => setForm(prev => ({ ...prev, shopifyDomain: e.target.value }))}
                  className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  The domain registered in your Shopify dashboard. Webhook order payloads from this shop domain will route here.
                </p>
              </div>

              {form.shopifyDomain === "" && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/25 rounded-lg flex items-start gap-2.5 text-yellow-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-normal">
                    Store domain is empty. Shopify webhooks will fall back to the workspace administrator.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save WhatsApp Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
