"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send, 
  Smartphone, 
  CheckCircle2, 
  MoreVertical, 
  Phone, 
  Video,
  Plus,
  Trash2,
  Save,
  Settings,
  Sparkles,
  Search,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Wifi,
  ExternalLink
} from "lucide-react"

import { apiFetch } from "@/shared/lib/api/client";

export default function MobileWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "automations" | "preview">("templates")
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  // Active template state
  const [activeTemplate, setActiveTemplate] = useState({
    id: "",
    name: "",
    content: "Hi {{customer_name}},\n\nYour order *{{order_number}}* for *{{product_name}}* of *{{amount}}* has been confirmed!\n\nThank you for shopping with us!"
  })

  // Automations mapping state
  const [automations, setAutomations] = useState<Record<string, { id?: string; isEnabled: boolean; templateId: string; providerOverride: string }>>({})

  const [whatsappStatus, setWhatsappStatus] = useState({
    whatsappNumber: "Loading...",
    isConnected: false,
    lastSync: "",
    webhookHealth: "",
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Dummy data for variable interpolation in chat preview
  const previewData: Record<string, string> = {
    customer_name: "Tony Stark",
    order_number: "#1099",
    amount: "Rs 9,50,000",
    product_name: "Arc Reactor Core",
    city: "Malibu",
    tracking_number: "TRK-ARC-88",
    courier_name: "Stark Cargo"
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
        whatsappNumber: "Offline",
        isConnected: false,
        lastSync: "Failed",
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
          setActiveTemplate({
            id: data[0].id,
            name: data[0].name,
            content: data[0].content
          })
        }
      }
    } catch (error) {
      console.error(error)
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
      console.error(error)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchTemplates()
    fetchAutomations()
  }, [])

  const saveTemplate = async () => {
    if (!activeTemplate.name.trim()) {
      alert("Please enter template name")
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
      console.error(error)
      alert("Error saving template")
    } finally {
      setIsSaving(false)
    }
  }

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete template?")) return
    try {
      const res = await apiFetch(`/templates/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        if (activeTemplate.id === id) {
          setActiveTemplate({
            id: "",
            name: "",
            content: "Hi {{customer_name}}..."
          })
        }
        await fetchTemplates()
        await fetchAutomations()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleUpdateAutomation = async (trigger: string, isEnabled: boolean, templateId: string, providerOverride: string) => {
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
      console.error(e)
      fetchAutomations()
    }
  }

  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newText = activeTemplate.content.substring(0, start) + `{{${variable}}}` + activeTemplate.content.substring(end)
      setActiveTemplate(prev => ({ ...prev, content: newText }))
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
    { key: "ORDER_CREATED", name: "Order Created", desc: "Sent when order is received." },
    { key: "ORDER_CONFIRMED", name: "Order Confirmed", desc: "Sent when order status changes to CONFIRMED." },
    { key: "ORDER_CANCELLED", name: "Order Cancelled", desc: "Sent when status changes to CANCELLED." },
    { key: "ORDER_SHIPPED", name: "Order Shipped", desc: "Sent when status changes to SHIPPED." },
    { key: "OUT_FOR_DELIVERY", name: "Out for Delivery", desc: "Sent when status changes to OUT_FOR_DELIVERY." },
    { key: "DELIVERED", name: "Order Delivered", desc: "Sent when status changes to DELIVERED." }
  ]

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0b141a] text-white">
      {/* Mobile Top Header */}
      <header className="bg-[#202c33] text-white px-4 py-3 flex items-center justify-between shadow-md z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">WhatsApp Engine</h1>
            <p className="text-[10px] text-gray-400">{whatsappStatus.isConnected ? "Gateway Connected" : "Gateway Offline"}</p>
          </div>
        </div>
        <button onClick={fetchStatus} disabled={isSyncing} className="text-cyan-400 hover:text-cyan-500">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-[#202c33] flex justify-around border-t border-gray-800 text-xs font-semibold">
        <button 
          onClick={() => setActiveTab("templates")}
          className={`flex-1 text-center py-3 border-b-2 transition-colors ${activeTab === "templates" ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400'}`}
        >
          Templates
        </button>
        <button 
          onClick={() => setActiveTab("preview")}
          className={`flex-1 text-center py-3 border-b-2 transition-colors ${activeTab === "preview" ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400'}`}
        >
          Chat Preview
        </button>
        <button 
          onClick={() => setActiveTab("automations")}
          className={`flex-1 text-center py-3 border-b-2 transition-colors ${activeTab === "automations" ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400'}`}
        >
          Automations
        </button>
      </div>

      {/* Tab Screen Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === "templates" && (
          <div className="p-4 space-y-4">
            {/* Template select dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={activeTemplate.id}
                onChange={(e) => {
                  const t = templates.find(item => item.id === e.target.value)
                  if (t) {
                    setActiveTemplate({ id: t.id, name: t.name, content: t.content })
                  } else {
                    setActiveTemplate({ id: "", name: "", content: "" })
                  }
                }}
                className="flex-1 bg-gray-900 border border-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-cyan-500/50"
              >
                <option value="">-- Create New Template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {activeTemplate.id && (
                <button 
                  onClick={(e) => deleteTemplate(activeTemplate.id, e as any)}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 p-2 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setActiveTemplate({ id: "", name: "", content: "" })}
                className="bg-cyan-500 text-black font-semibold px-3 py-2 rounded-lg text-sm"
              >
                New
              </button>
            </div>

            {/* Template Editor card */}
            <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Template Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Confirm Order"
                  value={activeTemplate.name}
                  onChange={(e) => setActiveTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block">Variable Injection</label>
                <div className="flex flex-wrap gap-1">
                  {["customer_name", "order_number", "product_name", "amount", "city", "tracking_number", "courier_name"].map(v => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] px-2 py-1 rounded"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 mt-1">
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Template Message Body</label>
                <textarea 
                  ref={textareaRef}
                  value={activeTemplate.content}
                  onChange={(e) => setActiveTemplate(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Hi {{customer_name}}..."
                  rows={6}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs font-mono resize-none focus:border-cyan-500"
                />
              </div>

              <button 
                onClick={saveTemplate}
                disabled={isSaving}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {activeTemplate.id ? "Update Template" : "Save Template"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="flex flex-col h-full items-center p-4 relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover'}} />
            
            <div className="self-center bg-[#182229] text-gray-400 text-xs py-1 px-3 rounded-lg mb-4 z-10">
              Live Mockup Preview
            </div>

            {/* Bubble */}
            <div className="bg-[#202c33] text-[#e9edef] rounded-lg p-3 text-[14px] shadow-sm self-start max-w-[85%] relative whitespace-pre-wrap leading-relaxed z-10 w-full">
              {renderPreviewContent()}
              <div className="text-[9px] text-right text-gray-400 mt-1 flex justify-end items-center gap-1">
                11:20 AM <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
              </div>
            </div>

            {/* Simulated Buttons */}
            <div className="flex flex-col gap-1 mt-1.5 max-w-[85%] self-start w-full z-10">
              <div className="w-full bg-[#202c33] text-[#53bdeb] h-10 shadow-sm flex items-center justify-center gap-2 rounded-lg font-medium text-[14px] cursor-not-allowed">
                Confirm Order
              </div>
              <div className="w-full bg-[#202c33] text-[#53bdeb] h-10 shadow-sm flex items-center justify-center gap-2 rounded-lg font-medium text-[14px] cursor-not-allowed">
                <ExternalLink className="w-4 h-4" /> Track Shipment
              </div>
            </div>
          </div>
        )}

        {activeTab === "automations" && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Event Triggers</h3>
            <div className="space-y-3">
              {triggersList.map(trigger => {
                const setting = automations[trigger.key] || { isEnabled: false, templateId: "", providerOverride: "DEFAULT" }
                return (
                  <div key={trigger.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">{trigger.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{trigger.desc}</p>
                      </div>
                      
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

                    <div className="space-y-2 border-t border-gray-800/60 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Mapped Template</span>
                        <select
                          value={setting.templateId}
                          onChange={(e) => handleUpdateAutomation(trigger.key, setting.isEnabled, e.target.value, setting.providerOverride || "DEFAULT")}
                          className="bg-black text-xs font-semibold text-cyan-400 border border-gray-850 rounded px-2 py-1 outline-none"
                        >
                          <option value="">Default confirmation</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Provider Override</span>
                        <select
                          value={setting.providerOverride || "DEFAULT"}
                          onChange={(e) => handleUpdateAutomation(trigger.key, setting.isEnabled, setting.templateId, e.target.value)}
                          className="bg-black text-xs font-semibold text-cyan-400 border border-gray-850 rounded px-2 py-1 outline-none"
                        >
                          <option value="DEFAULT">Default Provider</option>
                          <option value="META">Meta API</option>
                          <option value="WEB">WhatsApp Web QR</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
