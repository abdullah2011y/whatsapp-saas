"use client"

import { useState, useEffect, useRef } from "react"
import { 
  CheckCircle2, 
  Smartphone, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronRight,
  Save,
  Loader2,
  Search,
  ExternalLink
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Input } from "@/shared/components/ui/input"
import { apiFetch } from "@/shared/lib/api/client"

export default function WhatsAppTemplatesPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  // Active template state
  const [activeTemplate, setActiveTemplate] = useState({
    id: "",
    name: "",
    content: "Hi {{customer_name}},\n\nYour order *{{order_number}}* for *{{product_name}}* of *{{amount}}* has been confirmed!\n\nWe will ship it to {{city}} soon.\n\nThank you for shopping with us!"
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

  useEffect(() => {
    fetchTemplates()
  }, [])

  const saveTemplate = async () => {
    if (!activeTemplate.name.trim()) {
      alert("Please enter a template name")
      return
    }
    setIsSaving(true)
    try {
      const isEditing = !!activeTemplate.id
      const url = isEditing 
        ? `/templates/${activeTemplate.id}` 
        : `/templates`
      
      const res = await apiFetch(url, {
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

  return (
    <div className="flex-1 space-y-6 text-foreground">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-cyan-400 bg-clip-text text-transparent">
          WhatsApp Template Builder
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Build premium notification automation sequences triggered on order transitions.
        </p>
      </div>

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
    </div>
  )
}
