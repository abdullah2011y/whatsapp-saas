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
  Globe,
  Lock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { apiFetch } from "@/shared/lib/api/client"
import { useAuth } from "@/shared/lib/auth"
import { API_BASE_URL } from "@/shared/config/api"

export default function ShopifySettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [form, setForm] = useState({
    shopifyDomain: "",
    shopifyWebhookSecret: "",
    shopifyWebhookStatus: "INACTIVE"
  })

  const getWebhookUrl = () => {
    if (user?.id) {
      return `${API_BASE_URL}/shopify/webhook?userId=${user.id}`;
    }
    return `${API_BASE_URL}/shopify/webhook`;
  }

  const webhookUrl = getWebhookUrl();

  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/shopify/settings")
      if (res.ok) {
        const data = await res.json()
        setForm({
          shopifyDomain: data.shopifyDomain || "",
          shopifyWebhookSecret: data.shopifyWebhookSecret || "",
          shopifyWebhookStatus: data.shopifyWebhookStatus || "INACTIVE"
        })
      }
    } catch (err) {
      console.error("Failed to fetch Shopify settings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const copyToClipboard = (text: string, type: "url" | "secret") => {
    navigator.clipboard.writeText(text)
    if (type === "url") {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }

  const handleGenerateSecret = async () => {
    setIsGeneratingSecret(true)
    setWebhookTestResult(null)
    try {
      const res = await apiFetch("/shopify/webhook/generate-secret", {
        method: "POST"
      })
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({ ...prev, shopifyWebhookSecret: data.secret }))
      } else {
        alert("Failed to generate webhook secret.")
      }
    } catch (err) {
      console.error(err)
      alert("Error generating webhook secret.")
    } finally {
      setIsGeneratingSecret(false)
    }
  }

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const res = await apiFetch("/shopify/webhook/test", {
        method: "POST"
      })
      const data = await res.json()
      if (res.ok) {
        setWebhookTestResult({ success: true, message: data.message || "Webhook test order processed successfully!" })
      } else {
        setWebhookTestResult({ success: false, message: data.error || "Webhook test failed." })
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
      const res = await apiFetch("/shopify/settings", {
        method: "POST",
        body: JSON.stringify(form)
      })
      if (res.ok) {
        alert("Shopify Settings saved successfully!")
        await fetchSettings()
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
          Shopify Webhook Configuration
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure Shopify webhook verify credentials, store domains, and test connection endpoints.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* Webhook Configuration Section */}
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Shopify Webhooks
              </CardTitle>
              <CardDescription>Setup orders/create webhook endpoints to receive Shopify order events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Webhook Callback URL</label>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Copy this URL and paste it in your Shopify admin under Settings &gt; Notifications &gt; Webhooks.
                </p>
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

              {/* Webhook Secret */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Webhook Shared Secret</label>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Verify payload authenticity by matching signature headers computed with this secret.
                </p>
                <div className="flex items-center gap-2">
                  <Input 
                    type="password"
                    placeholder="Shared Webhook Secret (e.g. shopify_secret_123)"
                    value={form.shopifyWebhookSecret}
                    onChange={(e) => setForm(prev => ({ ...prev, shopifyWebhookSecret: e.target.value }))}
                    className="bg-black/40 border-border/40 font-mono text-xs flex-1"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(form.shopifyWebhookSecret, "secret")}
                    disabled={!form.shopifyWebhookSecret}
                    className="border-border/40 hover:bg-accent/40 shrink-0"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateSecret}
                    disabled={isGeneratingSecret}
                    className="border-border/40 hover:bg-accent/40 text-xs shrink-0"
                  >
                    {isGeneratingSecret ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                    Generate
                  </Button>
                </div>
              </div>

              {/* Webhook Status */}
              <div className="space-y-3 border-t border-border/20 pt-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Webhook Status</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.shopifyWebhookStatus === 'ACTIVE' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="shopifyWebhookStatus" 
                      value="ACTIVE"
                      checked={form.shopifyWebhookStatus === 'ACTIVE'}
                      onChange={(e) => setForm(prev => ({ ...prev, shopifyWebhookStatus: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Active</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Signatures are enforced and orders are auto-processed.</span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.shopifyWebhookStatus === 'INACTIVE' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="shopifyWebhookStatus" 
                      value="INACTIVE"
                      checked={form.shopifyWebhookStatus === 'INACTIVE'}
                      onChange={(e) => setForm(prev => ({ ...prev, shopifyWebhookStatus: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Inactive</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Temporary suspend order creation webhooks.</span>
                  </label>
                </div>
              </div>

              {/* Test Webhook Connection */}
              <div className="border-t border-border/20 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Webhook Connection Test</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Send a mock Shopify order payload signed with your webhook secret.</p>
                </div>
                <Button 
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook || !form.shopifyWebhookSecret}
                  className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black border border-green-500/30 font-bold px-4 py-2 text-xs"
                >
                  {isTestingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />}
                  Test Webhook
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
                    <h5 className="font-semibold text-sm">{webhookTestResult.success ? "Test Order Processed" : "Test Hook Failed"}</h5>
                    <p className="text-xs opacity-90 mt-1 font-mono leading-relaxed break-all">
                      {webhookTestResult.message}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Store Domain Configuration */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" /> Shop Domain
              </CardTitle>
              <CardDescription>Link shopify domain mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shopify Domain</label>
                <Input 
                  placeholder="e.g. mystore.myshopify.com"
                  value={form.shopifyDomain}
                  onChange={(e) => setForm(prev => ({ ...prev, shopifyDomain: e.target.value }))}
                  className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Link your workspace to incoming orders belonging to this store domain.
                </p>
              </div>

              {form.shopifyDomain === "" && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/25 rounded-lg flex items-start gap-2.5 text-yellow-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-normal">
                    Store domain is empty.shopify webhooks require shop domains to route orders properly.
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
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
