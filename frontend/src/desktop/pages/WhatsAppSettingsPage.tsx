"use client"

import { useState, useEffect } from "react"
import { 
  Loader2, 
  Save, 
  Settings,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    enabledProviders: "BOTH", // META, WEB, BOTH
    defaultProvider: "ASK",    // META, WEB, ASK
    confirmationMethod: "BUTTONS", // BUTTONS, POLLS, CUSTOM
    pollConfirmLabel: "✅ Yes Confirmed",
    pollCancelLabel: "❌ No Cancelled",
    shopifyDomain: ""
  })

  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/whatsapp/settings")
      if (res.ok) {
        const data = await res.json()
        setForm({
          enabledProviders: data.enabledProviders || "BOTH",
          defaultProvider: data.defaultProvider || "ASK",
          confirmationMethod: data.confirmationMethod || "BUTTONS",
          pollConfirmLabel: data.pollConfirmLabel || "✅ Yes Confirmed",
          pollCancelLabel: data.pollCancelLabel || "❌ No Cancelled",
          shopifyDomain: data.shopifyDomain || ""
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
  }, [])

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
                <div className="grid gap-3 sm:grid-cols-3">
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

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${form.defaultProvider === 'ASK' ? 'border-cyan-500 bg-cyan-950/10' : 'border-border/30 bg-black/25 hover:border-border/60'}`}>
                    <input 
                      type="radio" 
                      name="defaultProvider" 
                      value="ASK"
                      checked={form.defaultProvider === 'ASK'}
                      onChange={(e) => setForm(prev => ({ ...prev, defaultProvider: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-white">Ask Every Time</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Fallback automatically based on available sessions.</span>
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
