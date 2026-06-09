"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, 
  Smartphone, 
  Wifi, 
  MessageSquare, 
  RefreshCw,
  ExternalLink,
  Save,
  Loader2,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Settings,
  Bell,
  Truck,
  Layers,
  ChevronRight
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Input } from "@/shared/components/ui/input"

import { apiFetch } from "@/shared/lib/api/client";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "automations">("templates")
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  // Active template state
  const [activeTemplate, setActiveTemplate] = useState({
    id: "",
    name: "",
    content: "Hi {{customer_name}},\n\nYour order *{{order_number}}* for *{{product_name}}* of *{{amount}}* has been confirmed!\n\nWe will ship it to {{city}} soon.\n\nThank you for shopping with us!"
  })

  // Automations mapping state
  const [automations, setAutomations] = useState<Record<string, { id?: string; isEnabled: boolean; templateId: string; providerOverride: string }>>({})

  const [whatsappStatus, setWhatsappStatus] = useState({
    whatsappNumber: "Loading...",
    isConnected: false,
    lastSync: "Loading...",
    webhookHealth: "Loading...",
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sample data for preview interpolation
  const previewData: Record<string, string> = {
    customer_name: "Bruce Wayne",
    order_number: "#1088",
    amount: "Rs 75,000",
    product_name: "Kevlar Suit V2",
    city: "Gotham City",
    tracking_number: "TRK-BAT-99",
    courier_name: "Wayne Logistics"
  }

  const fetchStatus = async () => {
    setIsSyncing(true)
    try {
      const res = await apiFetch("/whatsapp/status")
      if (res.ok) {
        const data = await res.json()
        setWhatsappStatus({
          whatsappNumber: data.phoneNumberId || "Disconnected",
          isConnected: data.connected || false,
          lastSync: new Date().toLocaleTimeString(),
          webhookHealth: data.webhook ? "Active" : "Inactive"
        })
      }
    } catch (error) {
      setWhatsappStatus({
        whatsappNumber: "Backend Offline",
        isConnected: false,
        lastSync: "Failed to connect",
        webhookHealth: "Inactive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch("/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
        if (data.length > 0 && !activeTemplate.id) {
          // Default load first template
          setActiveTemplate({
            id: data[0].id,
            name: data[0].name,
            content: data[0].content
          })
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    }
  }

  const fetchAutomations = async () => {
    try {
      const res = await apiFetch("/automations")
      if (res.ok) {
        const data = await res.json()
        const dict: Record<string, { id?: string; isEnabled: boolean; templateId: string; providerOverride: string }> = {}
        data.forEach((a: any) => {
          dict[a.trigger] = {
            id: a.id,
            isEnabled: a.isEnabled,
            templateId: a.templateId || "",
            providerOverride: a.providerOverride || "DEFAULT"
          }
        })
        setAutomations(dict)
      }
    } catch (error) {
      console.error("Error fetching automations:", error)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchTemplates()
    fetchAutomations()

    // Auto-poll status every 12 seconds
    const intervalId = setInterval(() => {
      fetchStatus()
    }, 12000)

    return () => clearInterval(intervalId)
  }, [])

  const saveTemplate = async () => {
    if (!activeTemplate.name.trim()) {
      alert("Please enter a template name")
      return
    }
    setIsSaving(true)
    try {
      const isEditing = !!activeTemplate.id
      const endpoint = isEditing 
        ? `/templates/${activeTemplate.id}` 
        : `/templates`
      
      const res = await apiFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          name: activeTemplate.name,
          content: activeTemplate.content
        })
      })

      if (res.ok) {
        const saved = await res.json()
        setActiveTemplate(prev => ({ ...prev, id: saved.id }))
        await fetchTemplates()
        await fetchAutomations()
        alert("Template saved successfully!")
      } else {
        alert("Failed to save template")
      }
    } catch (error) {
      console.error("Error saving template:", error)
      alert("Error saving template")
    } finally {
      setIsSaving(false)
    }
  }

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this template?")) return
    try {
      const res = await apiFetch(`/templates/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        if (activeTemplate.id === id) {
          setActiveTemplate({
            id: "",
            name: "",
            content: "Hi {{customer_name}},\n\nYour order details update..."
          })
        }
        await fetchTemplates()
        await fetchAutomations()
      } else {
        alert("Failed to delete template")
      }
    } catch (error) {
      console.error(error)
      alert("Error deleting template")
    }
  }

  const startNewTemplate = () => {
    setActiveTemplate({
      id: "",
      name: "",
      content: "Hi {{customer_name}},\n\nYour order *{{order_number}}* update..."
    })
  }

  const handleUpdateAutomation = async (trigger: string, isEnabled: boolean, templateId: string, providerOverride: string) => {
    // Optimistic update
    setAutomations(prev => ({
      ...prev,
      [trigger]: {
        ...prev[trigger],
        isEnabled,
        templateId,
        providerOverride
      }
    }))

    try {
      await apiFetch("/automations", {
        method: "POST",
        body: JSON.stringify({
          trigger,
          isEnabled,
          templateId: templateId || null,
          providerOverride: providerOverride === "DEFAULT" ? null : providerOverride
        })
      })
    } catch (e) {
      console.error("Failed to save automation setting:", e)
      fetchAutomations()
    }
  }

  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newText = activeTemplate.content.substring(0, start) + `{{${variable}}}` + activeTemplate.content.substring(end)
      setActiveTemplate(prev => ({ ...prev, content: newText }))
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPos = start + variable.length + 4 // 4 is for {{ and }}
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)
    } else {
      setActiveTemplate(prev => ({ ...prev, content: prev.content + `{{${variable}}}` }))
    }
  }

  const renderPreviewContent = () => {
    let text = activeTemplate.content || ""
    
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      text = text.replace(regex, previewData[key])
    })
    
    const parts = text.split(/(\*.*?\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <b key={i} className="text-white font-bold">{part.substring(1, part.length - 1)}</b>
      }
      return <span key={i}>{part}</span>
    })
  }

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const triggersList = [
    { key: "ORDER_CREATED", name: "Order Created", desc: "Triggered immediately when a new order is received from Shopify.", icon: Bell },
    { key: "ORDER_CONFIRMED", name: "Order Confirmed", desc: "Triggered when order status changes to CONFIRMED.", icon: CheckCircle2 },
    { key: "ORDER_CANCELLED", name: "Order Cancelled", desc: "Triggered when order status changes to CANCELLED.", icon: Trash2 },
    { key: "ORDER_SHIPPED", name: "Order Shipped", desc: "Triggered when order status changes to SHIPPED (with Tracking details).", icon: Truck },
    { key: "OUT_FOR_DELIVERY", name: "Out for Delivery", desc: "Triggered when status changes to OUT_FOR_DELIVERY.", icon: Layers },
    { key: "DELIVERED", name: "Order Delivered", desc: "Triggered when status changes to DELIVERED.", icon: CheckCircle2 }
  ]

  return (
    <div className="flex-1 space-y-6 relative text-foreground">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
            WhatsApp Template Engine
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Build premium notification automation sequences triggered on order transitions.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={fetchStatus}
            disabled={isSyncing}
            className="border-border/50 bg-background/50 backdrop-blur-sm gap-2"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : <RefreshCw className="h-4 w-4 text-cyan-400" />} 
            Sync Gateway
          </Button>
        </div>
      </div>

      {/* Connection & Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`bg-black/30 backdrop-blur-md border-border/40 transition-all ${whatsappStatus.isConnected ? 'shadow-[0_0_15px_rgba(0,255,150,0.05)]' : 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection Status</CardTitle>
            <Wifi className={`h-4 w-4 ${whatsappStatus.isConnected ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${whatsappStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {whatsappStatus.isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Number ID: {whatsappStatus.whatsappNumber}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/30 backdrop-blur-md border-border/40 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automation Rules Active</CardTitle>
            <Settings className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Object.values(automations).filter(a => a.isEnabled).length} / 6
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active webhook notification events
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/30 backdrop-blur-md border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Templates</CardTitle>
            <MessageSquare className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{templates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Saved custom text notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border/40 pb-px">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all gap-2 flex items-center ${activeTab === "templates" ? 'border-cyan-400 text-cyan-400 bg-cyan-950/10' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Sparkles className="w-4 h-4" /> Template Builder
        </button>
        <button
          onClick={() => setActiveTab("automations")}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all gap-2 flex items-center ${activeTab === "automations" ? 'border-cyan-400 text-cyan-400 bg-cyan-950/10' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Settings className="w-4 h-4" /> Automation Settings
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "templates" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Templates Directory Panel */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-black/20 border-border/40 backdrop-blur-sm h-full flex flex-col min-h-[500px]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold text-white">Templates</CardTitle>
                  <Button 
                    size="sm"
                    onClick={startNewTemplate}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-8 py-0 gap-1"
                  >
                    <Plus className="w-4 h-4" /> New
                  </Button>
                </div>
                <CardDescription>Search and manage saved templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col p-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-black/40 border-border/40 focus-visible:ring-cyan-500/50"
                  />
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[350px] pr-1">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/30 rounded-lg">
                      No templates found.
                    </div>
                  ) : (
                    filteredTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        onClick={() => setActiveTemplate({
                          id: tpl.id,
                          name: tpl.name,
                          content: tpl.content
                        })}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center group ${activeTemplate.id === tpl.id ? 'bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-black/20 border-border/30 hover:border-border/60'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-white truncate">{tpl.name}</h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{tpl.content}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => deleteTemplate(tpl.id, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Builder & Live Preview Panels */}
          <div className="lg:col-span-8 grid gap-6 md:grid-cols-2">
            {/* Editor Card */}
            <Card className="bg-black/20 border-border/40 backdrop-blur-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-white">
                  {activeTemplate.id ? "Edit Template" : "Create New Template"}
                </CardTitle>
                <CardDescription>Design body structure and insert triggers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template Name</label>
                  <Input 
                    placeholder="e.g. Order Shipped Update"
                    value={activeTemplate.name}
                    onChange={(e) => setActiveTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Variable Insertion Shortcuts</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["customer_name", "order_number", "product_name", "amount", "city", "tracking_number", "courier_name"].map(v => (
                      <Button
                        key={v}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(v)}
                        className="bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all text-[11px] h-7 px-2"
                      >
                        {`{{${v}}}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message Content</label>
                  <Textarea 
                    ref={textareaRef}
                    value={activeTemplate.content}
                    onChange={(e) => setActiveTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Type your WhatsApp notification body here..."
                    className="bg-black/40 border-border/40 focus-visible:ring-cyan-500/50 min-h-[180px] resize-none font-mono text-xs leading-relaxed"
                  />
                  <span className="text-[10px] text-muted-foreground leading-normal block">
                    Use *text* to write bold headers. Avoid markdown links.
                  </span>
                </div>

                {/* Read-Only Interactive Buttons */}
                <div className="space-y-1.5 border-t border-border/30 pt-3">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enforced Interactive Buttons</label>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="w-full pointer-events-none opacity-60 text-xs h-8" tabIndex={-1}>
                      Confirm Order
                    </Button>
                    <Button variant="secondary" className="w-full pointer-events-none opacity-60 text-xs h-8" tabIndex={-1}>
                      Track Shipment
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={saveTemplate}
                  disabled={isSaving}
                  className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {activeTemplate.id ? "Update Template" : "Save Template"}
                </Button>
              </CardContent>
            </Card>

            {/* Live WhatsApp Mockup Card */}
            <Card className="bg-black/20 border-border/40 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center p-6 relative min-h-[480px]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.06),transparent)] pointer-events-none" />

              <div className="text-center mb-4 z-10">
                <h3 className="font-bold text-sm text-white">Live Mockup View</h3>
                <p className="text-[10px] text-muted-foreground">Simulated notification render</p>
              </div>

              {/* Chat Bubble Container */}
              <div className="relative z-10 w-full max-w-[280px] bg-[#0b141a] rounded-xl border border-border/20 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white leading-none">WhatsApp Order Bot</h4>
                    <p className="text-[9px] text-[#53bdeb] mt-0.5 font-medium">Official Business Account</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 bg-[#0b141a] min-h-[220px] flex flex-col gap-2 relative">
                  {/* WhatsApp style message text */}
                  <div className="bg-[#202c33] rounded-lg p-2.5 text-xs text-gray-200 shadow-md self-start w-[92%] relative whitespace-pre-wrap leading-relaxed">
                    {renderPreviewContent()}
                    <div className="text-[9px] text-right text-gray-400 mt-1">11:15 AM</div>
                  </div>

                  {/* WhatsApp style reply buttons */}
                  <div className="flex flex-col gap-1.5 mt-1 max-w-[92%] self-start w-full">
                    <div className="w-full bg-[#202c33] text-[#53bdeb] h-8 shadow-sm flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs border-t border-white/5 cursor-not-allowed">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Order
                    </div>
                    <div className="w-full bg-[#202c33] text-[#53bdeb] h-8 shadow-sm flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs border-t border-white/5 cursor-not-allowed">
                      <ExternalLink className="w-3.5 h-3.5" /> Track Shipment
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* AUTOMATION MAPPINGS TAB */
        <div className="space-y-6">
          <Card className="bg-black/20 border-border/40 backdrop-blur-sm p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold text-white">Event Automations</CardTitle>
              <CardDescription>
                Map lifecycle actions to saved message templates. Changes save in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {triggersList.map(trigger => {
                  const IconComp = trigger.icon
                  const setting = automations[trigger.key] || { isEnabled: false, templateId: "", providerOverride: "DEFAULT" }
                  
                  return (
                    <div 
                      key={trigger.key} 
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${setting.isEnabled ? 'bg-cyan-950/10 border-cyan-500/40' : 'bg-black/30 border-border/30'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${setting.isEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-white">{trigger.name}</h4>
                            
                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={setting.isEnabled} 
                                onChange={(e) => handleUpdateAutomation(trigger.key, e.target.checked, setting.templateId, setting.providerOverride || "DEFAULT")}
                                className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-black after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-400"></div>
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{trigger.desc}</p>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-border/20 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Assigned Template</span>
                          <select
                            value={setting.templateId}
                            onChange={(e) => handleUpdateAutomation(trigger.key, setting.isEnabled, e.target.value, setting.providerOverride || "DEFAULT")}
                            className="bg-black/50 text-xs font-medium text-cyan-400 border border-border/40 rounded px-2.5 py-1.5 outline-none focus:border-cyan-500/50 cursor-pointer min-w-[160px]"
                          >
                            <option value="" className="bg-gray-900 text-gray-400">
                              {trigger.key === "ORDER_CREATED" ? "Default confirmation buttons" : "Choose template..."}
                            </option>
                            {templates.map(t => (
                              <option key={t.id} value={t.id} className="bg-gray-900 text-white">
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Provider Override</span>
                          <select
                            value={setting.providerOverride || "DEFAULT"}
                            onChange={(e) => handleUpdateAutomation(trigger.key, setting.isEnabled, setting.templateId, e.target.value)}
                            className="bg-black/50 text-xs font-medium text-cyan-400 border border-border/40 rounded px-2.5 py-1.5 outline-none focus:border-cyan-500/50 cursor-pointer min-w-[160px]"
                          >
                            <option value="DEFAULT" className="bg-gray-900 text-white">Default Provider</option>
                            <option value="META" className="bg-gray-900 text-white">Meta API</option>
                            <option value="WEB" className="bg-gray-900 text-white">WhatsApp Web QR</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
