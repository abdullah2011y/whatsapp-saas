"use client"

import { useState, useEffect } from "react"
import { 
  CheckCircle2, 
  Trash2, 
  Settings, 
  Bell, 
  Truck, 
  Layers
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppAutomationsPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [automations, setAutomations] = useState<Record<string, { id?: string; isEnabled: boolean; templateId: string }>>({})

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch("/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
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
        const dict: Record<string, { id?: string; isEnabled: boolean; templateId: string }> = {}
        data.forEach((a: any) => {
          dict[a.trigger] = {
            id: a.id,
            isEnabled: a.isEnabled,
            templateId: a.templateId || ""
          }
        })
        setAutomations(dict)
      }
    } catch (error) {
      console.error("Error fetching automations:", error)
    }
  }

  useEffect(() => {
    fetchTemplates()
    fetchAutomations()
  }, [])

  const handleUpdateAutomation = async (trigger: string, isEnabled: boolean, templateId: string) => {
    // Optimistic update
    setAutomations(prev => ({
      ...prev,
      [trigger]: {
        ...prev[trigger],
        isEnabled,
        templateId
      }
    }))

    try {
      await apiFetch("/automations", {
        method: "POST",
        body: JSON.stringify({
          trigger,
          isEnabled,
          templateId: templateId || null
        })
      })
    } catch (e) {
      console.error("Failed to save automation setting:", e)
      fetchAutomations()
    }
  }

  const triggersList = [
    { key: "ORDER_CREATED", name: "Order Created", desc: "Triggered immediately when a new order is received from Shopify.", icon: Bell },
    { key: "ORDER_CONFIRMED", name: "Order Confirmed", desc: "Triggered when order status changes to CONFIRMED.", icon: CheckCircle2 },
    { key: "ORDER_CANCELLED", name: "Order Cancelled", desc: "Triggered when order status changes to CANCELLED.", icon: Trash2 },
    { key: "ORDER_SHIPPED", name: "Order Shipped", desc: "Triggered when order status changes to SHIPPED (with Tracking details).", icon: Truck },
    { key: "OUT_FOR_DELIVERY", name: "Out for Delivery", desc: "Triggered when status changes to OUT_FOR_DELIVERY.", icon: Layers },
    { key: "DELIVERED", name: "Order Delivered", desc: "Triggered when status changes to DELIVERED.", icon: CheckCircle2 }
  ]

  return (
    <div className="flex-1 space-y-6 text-foreground">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
          WhatsApp Automation Rules
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Map Shopify order lifecycle events to your custom notification templates.
        </p>
      </div>

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
              const setting = automations[trigger.key] || { isEnabled: false, templateId: "" }
              
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
                            onChange={(e) => handleUpdateAutomation(trigger.key, e.target.checked, setting.templateId)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-black after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-400"></div>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{trigger.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/20 pt-3">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Assigned Template</span>
                    <select
                      value={setting.templateId}
                      onChange={(e) => handleUpdateAutomation(trigger.key, setting.isEnabled, e.target.value)}
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
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
