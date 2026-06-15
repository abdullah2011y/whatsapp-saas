"use client"

import { API_BASE_URL } from "@/shared/config/api"
import * as React from "react"
import {
  Users,
  Key,
  FileText,
  LayoutDashboard,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Lock,
  Unlock,
  Search,
  Plus,
  Coins,
  Activity,
  CheckCircle2,
  XCircle,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
  Laptop,
  Database,
  Sliders,
  Download,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { apiFetch } from "@/shared/lib/api/client"
import { useAuth } from "@/shared/lib/auth"

export default function AdminDashboardPage() {
  const { impersonate } = useAuth()
  const [activeTab, setActiveTab] = React.useState<"overview" | "users" | "plans" | "licenses" | "health" | "backups" | "logs">("overview")
  const [stats, setStats] = React.useState<any>(null)
  const [users, setUsers] = React.useState<any[]>([])
  const [plans, setPlans] = React.useState<any[]>([])
  const [licenses, setLicenses] = React.useState<any[]>([])
  const [health, setHealth] = React.useState<any>(null)
  const [backups, setBackups] = React.useState<any[]>([])
  const [logs, setLogs] = React.useState<any[]>([])
  
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Disaster Recovery / Config State
  const [sysConfig, setSysConfig] = React.useState<any>({
    MAINTENANCE_MODE: "false",
    READ_ONLY_MODE: "false",
    EMERGENCY_SHUTDOWN: "false"
  })

  // Modals & Forms State
  const [modalUser, setModalUser] = React.useState<any>(null)
  const [showPasswordModal, setShowPasswordModal] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")

  const [showExtendModal, setShowExtendModal] = React.useState(false)
  const [extendDays, setExtendDays] = React.useState(30)

  const [modalLicense, setModalLicense] = React.useState<any>(null)
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assignUserId, setAssignUserId] = React.useState("")

  const [generateDuration, setGenerateDuration] = React.useState("1 Month")
  const [bulkCount, setBulkCount] = React.useState(1)

  // Plan CRUD modal
  const [showPlanModal, setShowPlanModal] = React.useState(false)
  const [modalPlan, setModalPlan] = React.useState<any>(null)
  const [planForm, setPlanForm] = React.useState({
    name: "",
    priceMonthly: 0,
    priceYearly: 0,
    durationDays: 30,
    maxOrders: 500,
    maxMessages: 500,
    maxTemplates: 10,
    maxAutomations: 5,
    maxSessions: 1,
    features: [] as string[]
  })

  // Restore database modal
  const [showRestoreModal, setShowRestoreModal] = React.useState(false)
  const [restoreBackupId, setRestoreBackupId] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  const fetchStats = async () => {
    try {
      const res = await apiFetch("/admin/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error("Failed to fetch admin users:", err)
    }
  }

  const fetchPlans = async () => {
    try {
      const res = await apiFetch("/admin/plans")
      if (res.ok) {
        const data = await res.json()
        setPlans(data)
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err)
    }
  }

  const fetchLicenses = async () => {
    try {
      const res = await apiFetch("/admin/licenses")
      if (res.ok) {
        const data = await res.json()
        setLicenses(data)
      }
    } catch (err) {
      console.error("Failed to fetch admin licenses:", err)
    }
  }

  const fetchHealth = async () => {
    try {
      const res = await apiFetch("/admin/health")
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
      }
    } catch (err) {
      console.error("Failed to fetch health:", err)
    }
  }

  const fetchBackups = async () => {
    try {
      const res = await apiFetch("/admin/backups")
      if (res.ok) {
        const data = await res.json()
        setBackups(data)
      }
    } catch (err) {
      console.error("Failed to fetch backups:", err)
    }
  }

  const fetchSysConfig = async () => {
    try {
      const res = await apiFetch("/admin/system-config")
      if (res.ok) {
        const data = await res.json()
        setSysConfig(data)
      }
    } catch (err) {
      console.error("Failed to fetch system configs:", err)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await apiFetch("/admin/logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (err) {
      console.error("Failed to fetch admin audit logs:", err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchPlans(),
      fetchLicenses(),
      fetchHealth(),
      fetchBackups(),
      fetchSysConfig(),
      fetchLogs()
    ])
    setLoading(false)
  }

  React.useEffect(() => {
    loadData()
  }, [])

  // User Actions
  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"
    if (!confirm(`Are you sure you want to change user status to ${nextStatus}?`)) return

    try {
      const res = await apiFetch(`/admin/users/${userId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      })
      if (res.ok) {
        fetchUsers()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update user status")
      }
    } catch (err) {
      console.error("Status toggle error:", err)
    }
  }

  const handleRestoreUser = async (userId: string) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}/restore`, {
        method: "POST"
      })
      if (res.ok) {
        alert("Account successfully restored with 30-day grace period!")
        fetchUsers()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to restore user account")
      }
    } catch (err) {
      console.error("Restore user error:", err)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalUser) return

    try {
      const res = await apiFetch(`/admin/users/${modalUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) {
        alert("Password updated successfully!")
        setShowPasswordModal(false)
        setNewPassword("")
        setModalUser(null)
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to reset password")
      }
    } catch (err) {
      console.error("Reset password error:", err)
    }
  }

  const handleExtendSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalUser) return

    try {
      const res = await apiFetch(`/admin/users/${modalUser.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: extendDays })
      })
      if (res.ok) {
        alert(`Subscription extended by ${extendDays} days!`)
        setShowExtendModal(false)
        setExtendDays(30)
        setModalUser(null)
        fetchUsers()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to extend subscription")
      }
    } catch (err) {
      console.error("Extend subscription error:", err)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("CRITICAL WARNING: This will permanently delete the user account and all their Shopify configurations, WhatsApp configurations, and data. Are you sure you want to delete this user?")) return

    try {
      const res = await apiFetch(`/admin/users/${userId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        fetchUsers()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete user")
      }
    } catch (err) {
      console.error("Delete user error:", err)
    }
  }

  // Impersonation Login As
  const handleImpersonate = async (userId: string) => {
    if (!confirm("Are you sure you want to login as this user? You will be redirected to their dashboard, and you can return to Admin later via the sidebar button.")) return
    try {
      const res = await apiFetch(`/admin/impersonate/${userId}`, {
        method: "POST"
      })
      if (res.ok) {
        const data = await res.json()
        impersonate(data.token, data.user)
      } else {
        const data = await res.json()
        alert(data.error || "Impersonation request failed")
      }
    } catch (err) {
      console.error("Impersonate error:", err)
    }
  }

  // License key generation
  const handleGenerateLicense = async () => {
    try {
      const endpoint = bulkCount > 1 ? "/admin/licenses/bulk-generate" : "/admin/licenses/generate"
      const payload = bulkCount > 1 
        ? { duration: generateDuration, count: bulkCount }
        : { duration: generateDuration }

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        alert("License key(s) generated successfully!")
        setBulkCount(1)
        fetchLicenses()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to generate license")
      }
    } catch (err) {
      console.error("Key generation error:", err)
    }
  }

  const handleToggleLicense = async (keyId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "DEACTIVATED" ? "ACTIVE" : "DEACTIVATED"
    if (!confirm(`Are you sure you want to toggle this license to ${nextStatus}?`)) return

    try {
      const res = await apiFetch("/admin/licenses/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, status: nextStatus })
      })
      if (res.ok) {
        fetchLicenses()
        fetchUsers()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to toggle license status")
      }
    } catch (err) {
      console.error("Toggle license error:", err)
    }
  }

  const handleAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalLicense || !assignUserId) return

    try {
      const res = await apiFetch("/admin/licenses/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: modalLicense.id, userId: assignUserId })
      })
      if (res.ok) {
        alert("License key successfully assigned to user!")
        setShowAssignModal(false)
        setAssignUserId("")
        setModalLicense(null)
        fetchLicenses()
        fetchUsers()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to assign license")
      }
    } catch (err) {
      console.error("Assign license error:", err)
    }
  }

  // Plan CRUD functions
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = modalPlan ? "PUT" : "POST"
    const url = modalPlan ? `/admin/plans/${modalPlan.id}` : "/admin/plans"

    try {
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm)
      })

      if (res.ok) {
        alert("Plan saved successfully!")
        setShowPlanModal(false)
        setModalPlan(null)
        fetchPlans()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save plan")
      }
    } catch (err) {
      console.error("Save plan error:", err)
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan? Users with this plan won't be deleted, but they will lose custom boundaries on refresh.")) return
    try {
      const res = await apiFetch(`/admin/plans/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchPlans()
        fetchStats()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete plan")
      }
    } catch (err) {
      console.error("Delete plan error:", err)
    }
  }

  // Backup & Disaster functions
  const handleCreateBackup = async () => {
    try {
      const res = await apiFetch("/admin/backups", { method: "POST" })
      if (res.ok) {
        alert("Backup snapshot completed successfully!")
        fetchBackups()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create snapshot")
      }
    } catch (err) {
      console.error("Backup error:", err)
    }
  }

  const handleDownloadBackup = (id: string, filename: string) => {
    const token = localStorage.getItem("token")
    window.open(`${API_BASE_URL}/admin/backups/${id}/download?token=${token}`, "_blank")
  }

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restoreBackupId || !confirmPassword) return

    try {
      const res = await apiFetch(`/admin/backups/${restoreBackupId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword })
      })

      if (res.ok) {
        alert("Database successfully restored! Relogging/refreshing registry dashboard.")
        setShowRestoreModal(false)
        setConfirmPassword("")
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || "Restoration failed")
      }
    } catch (err) {
      console.error("Restore error:", err)
    }
  }

  const handleDeleteBackup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this backup file?")) return
    try {
      const res = await apiFetch(`/admin/backups/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchBackups()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete backup record")
      }
    } catch (err) {
      console.error("Delete backup error:", err)
    }
  }

  const handleToggleSysConfig = async (key: string, currentValue: string) => {
    const nextValue = currentValue === "true" ? "false" : "true"
    if (!confirm(`Are you sure you want to toggle system config ${key} to ${nextValue}?`)) return
    try {
      const res = await apiFetch("/admin/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: nextValue })
      })
      if (res.ok) {
        fetchSysConfig()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update configuration")
      }
    } catch (err) {
      console.error("Sysconfig update error:", err)
    }
  }

  // Helpers
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.company && u.company.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</Badge>
      case "SUSPENDED":
        return <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20">Suspended</Badge>
      case "ARCHIVED":
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    if (plan === "Lifetime") {
      return <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider">Lifetime</Badge>
    }
    if (plan === "Free") {
      return <Badge variant="outline" className="text-gray-400 border-gray-500/20">Free Trial</Badge>
    }
    return <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">{plan}</Badge>
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-[0.2em] font-heading">
            <Shield className="w-4 h-4 text-cyan-400 shadow-sm" />
            Super Admin Portal
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">Global SaaS Controller</h2>
        </div>
        <Button onClick={loadData} disabled={loading} size="sm" variant="outline" className="border-border/40 hover:bg-white/5 cursor-pointer">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Sync All Registries
        </Button>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap border-b border-border/30 gap-1 sm:gap-2">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "users", label: "Users Registry", icon: Users },
          { id: "plans", label: "SaaS Plans", icon: Sliders },
          { id: "licenses", label: "Licenses", icon: Key },
          { id: "health", label: "System Health", icon: Activity },
          { id: "backups", label: "Backup & Recovery", icon: Database },
          { id: "logs", label: "Audit Logs", icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/10"
                : "border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && !stats ? (
        <div className="flex justify-center items-center py-20">
          <Activity className="w-10 h-10 text-cyan-400 animate-pulse mr-2" />
          <span className="text-sm text-cyan-400/80 font-medium font-heading tracking-widest uppercase">Fetching registries...</span>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              {/* Financial Metrics Row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Monthly Recur. Revenue (MRR)", value: `Rs ${(stats.mrr || 0).toLocaleString()}`, desc: "Active monthly subscription prices", icon: Coins, color: "text-cyan-400" },
                  { title: "Annual Recur. Revenue (ARR)", value: `Rs ${(stats.arr || 0).toLocaleString()}`, desc: "Calculated MRR x 12", icon: Coins, color: "text-purple-400" },
                  { title: "Active Subscribers", value: stats.activeSubscribers || 0, desc: "Paid license users", icon: Shield, color: "text-emerald-400" },
                  { title: "Churn Rate", value: `${stats.churnRate || 0}%`, desc: "Expired / total users", icon: AlertTriangle, color: "text-rose-400" }
                ].map((s, i) => (
                  <Card key={i} className="bg-black/30 border-border/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.title}</CardTitle>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</div>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Standard Counters Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { title: "Total Users", value: stats.totalUsers, desc: "Registered accounts", icon: Users, color: "text-cyan-400" },
                  { title: "Lifetime Users", value: stats.lifetimeCustomers || 0, desc: "Infinite plan access", icon: Sparkles, color: "text-purple-400" },
                  { title: "WhatsApp Active", value: stats.whatsappConnected, desc: "Connected sessions", icon: Laptop, color: "text-cyan-400" },
                  { title: "Shopify Active", value: stats.shopifyConnected, desc: "Shopify connections", icon: ExternalLink, color: "text-cyan-400" },
                  { title: "Total Orders Flow", value: stats.totalOrders, desc: "Automation events", icon: Activity, color: "text-cyan-400" }
                ].map((s, i) => (
                  <Card key={i} className="bg-black/30 border-border/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.05)] transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.title}</CardTitle>
                      <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{s.value}</div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Plan Distribution and Processing Volume charts/visualizer */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-black/30 border-border/40">
                  <CardHeader>
                    <CardTitle className="text-white">Plan Distribution</CardTitle>
                    <CardDescription>Breakdown of active users and MRR share by tier</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.planDistribution && Object.keys(stats.planDistribution).length > 0 ? (
                      Object.entries(stats.planDistribution).map(([name, data]: any) => (
                        <div key={name} className="flex justify-between items-center bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            {getPlanBadge(name)}
                            <span className="text-xs text-muted-foreground">{data.count} User(s)</span>
                          </div>
                          <span className="text-sm font-bold text-cyan-400">Rs {data.mrr.toLocaleString()}/mo</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-6">No plan breakdowns available.</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-black/30 border-border/40">
                  <CardHeader>
                    <CardTitle className="text-white">Processing Volume (Confirmed Orders)</CardTitle>
                    <CardDescription>Monthly order amount totals across all users</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.revenueByMonth && stats.revenueByMonth.length > 0 ? (
                      stats.revenueByMonth.map((hist: any) => (
                        <div key={hist.month} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white">{hist.month}</span>
                            <span className="text-cyan-400 font-bold">Rs {hist.revenue.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="bg-cyan-500 h-full rounded-full shadow-[0_0_8px_rgba(0,240,255,0.7)]" 
                              style={{ width: `${Math.min(100, (hist.revenue / (stats.totalRevenue || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-6">No order flow history recorded.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* USER REGISTRY TAB */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-black/40 border-border/40 focus:border-cyan-400 rounded-xl"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} registered accounts
                </div>
              </div>

              <div className="border border-border/40 rounded-xl overflow-x-auto bg-black/20">
                <Table>
                  <TableHeader className="bg-white/[0.02]">
                    <TableRow>
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Company</TableHead>
                      <TableHead className="text-muted-foreground">Reg. Date</TableHead>
                      <TableHead className="text-muted-foreground">Plan</TableHead>
                      <TableHead className="text-muted-foreground">License</TableHead>
                      <TableHead className="text-muted-foreground">Expiry</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No users found matching search query
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-white/[0.01]">
                          <TableCell className="font-semibold text-white">{user.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{user.email}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{user.company || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getPlanBadge(user.plan)}</TableCell>
                          <TableCell className="font-mono text-[10px] text-cyan-400/80">
                            {user.licenseKey || "None"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {user.expiresAt ? (
                              user.plan === "Lifetime" ? "Never" : new Date(user.expiresAt).toLocaleDateString()
                            ) : "—"}
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right space-x-1 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImpersonate(user.id)}
                              className="h-7 px-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/30 rounded-lg text-xs"
                            >
                              Login As
                            </Button>

                            {user.status === "ARCHIVED" || user.status === "SUSPENDED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreUser(user.id)}
                                className="h-7 px-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 rounded-lg text-xs"
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusToggle(user.id, user.status)}
                                className="h-7 px-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30 rounded-lg text-xs"
                              >
                                Suspend
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setModalUser(user)
                                setShowExtendModal(true)
                              }}
                              className="h-7 px-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30 rounded-lg text-xs"
                            >
                              Extend
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setModalUser(user)
                                setShowPasswordModal(true)
                              }}
                              className="h-7 px-2 border-border/40 hover:bg-white/5 rounded-lg text-xs text-gray-300"
                            >
                              PW
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.id)}
                              className="h-7 px-1.5 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black border-red-500/30 rounded-lg text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* SAAS PLANS CRUD TAB */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">SaaS Billing Engine Tiers</h3>
                <Button
                  onClick={() => {
                    setModalPlan(null)
                    setPlanForm({
                      name: "",
                      priceMonthly: 0,
                      priceYearly: 0,
                      durationDays: 30,
                      maxOrders: 500,
                      maxMessages: 500,
                      maxTemplates: 10,
                      maxAutomations: 5,
                      maxSessions: 1,
                      features: []
                    })
                    setShowPlanModal(true)
                  }}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs rounded-lg h-9"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add New Plan
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((p) => (
                  <Card key={p.id} className="bg-black/30 border-border/40 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(0,240,255,0.05)] transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-white text-xl">{p.name}</CardTitle>
                        <Badge variant="outline" className="text-cyan-400 border-cyan-400/20 font-mono text-[10px]">
                          {p.durationDays} Days
                        </Badge>
                      </div>
                      <CardDescription className="text-xs pt-1">
                        Monthly: <strong>Rs {p.priceMonthly}</strong> | Yearly: <strong>Rs {p.priceYearly}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                      <div className="border-t border-border/30 pt-3 space-y-2 text-gray-300">
                        <div className="flex justify-between">
                          <span>Max Orders / mo:</span>
                          <span className="font-semibold text-white">{p.maxOrders.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max WA Messages / mo:</span>
                          <span className="font-semibold text-white">{p.maxMessages.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Saved Templates:</span>
                          <span className="font-semibold text-white">{p.maxTemplates}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Automations:</span>
                          <span className="font-semibold text-white">{p.maxAutomations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max WA Sessions:</span>
                          <span className="font-semibold text-white">{p.maxSessions}</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Features:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {JSON.parse(p.features || "[]").map((f: string) => (
                              <Badge key={f} className="bg-white/5 border border-white/10 text-[9px] text-gray-300">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border/30 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModalPlan(p)
                            setPlanForm({
                              name: p.name,
                              priceMonthly: p.priceMonthly,
                              priceYearly: p.priceYearly,
                              durationDays: p.durationDays,
                              maxOrders: p.maxOrders,
                              maxMessages: p.maxMessages,
                              maxTemplates: p.maxTemplates,
                              maxAutomations: p.maxAutomations,
                              maxSessions: p.maxSessions,
                              features: JSON.parse(p.features || "[]")
                            })
                            setShowPlanModal(true)
                          }}
                          className="h-8 text-xs border-border/40 hover:bg-white/5"
                        >
                          Modify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePlan(p.id)}
                          className="h-8 text-xs bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black border-red-500/30"
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* LICENSES MANAGER TAB */}
          {activeTab === "licenses" && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left Column: Generate Form */}
              <Card className="bg-black/30 border-border/40 h-fit md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Key Generator
                  </CardTitle>
                  <CardDescription>Generate individual or bulk license activation codes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Plan Duration</label>
                    <select
                      value={generateDuration}
                      onChange={(e) => setGenerateDuration(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-black/40 border border-border/40 text-white focus:border-cyan-400 text-sm focus:outline-none"
                    >
                      <option value="1 Month">1 Month Plan</option>
                      <option value="3 Months">3 Months Plan</option>
                      <option value="6 Months">6 Months Plan</option>
                      <option value="12 Months">12 Months Plan</option>
                      <option value="Lifetime">Lifetime Unlimited</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Keys Count</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Number(e.target.value) || 1)}
                      className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-10"
                    />
                  </div>

                  <Button onClick={handleGenerateLicense} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Key(s)
                  </Button>
                </CardContent>
              </Card>

              {/* Right Column: Key List */}
              <div className="md:col-span-2 space-y-4">
                <div className="border border-border/40 rounded-xl overflow-hidden bg-black/20">
                  <Table>
                    <TableHeader className="bg-white/[0.02]">
                      <TableRow>
                        <TableHead className="text-muted-foreground">License Key</TableHead>
                        <TableHead className="text-muted-foreground">Duration</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Expiry</TableHead>
                        <TableHead className="text-muted-foreground">Assigned User</TableHead>
                        <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No licenses generated yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        licenses.map((lic) => (
                          <TableRow key={lic.id} className="hover:bg-white/[0.01]">
                            <TableCell className="font-mono text-cyan-400 font-bold">{lic.key}</TableCell>
                            <TableCell>{getPlanBadge(lic.duration)}</TableCell>
                            <TableCell>
                              {lic.status === "ACTIVE" ? (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Active</Badge>
                              ) : lic.status === "UNUSED" ? (
                                <Badge variant="outline" className="text-cyan-400/70 border-cyan-400/20">Unused</Badge>
                              ) : (
                                <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/20">Deactivated</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {lic.user ? (
                                <div className="text-white font-medium">
                                  {lic.user.name} <span className="text-muted-foreground text-[10px] block">{lic.user.email}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {lic.status !== "UNUSED" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleLicense(lic.id, lic.status)}
                                  className={`h-7 px-2.5 rounded-lg text-xs ${
                                    lic.status === "DEACTIVATED"
                                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                                      : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30"
                                  }`}
                                >
                                  {lic.status === "DEACTIVATED" ? "Reactivate" : "Deactivate"}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setModalLicense(lic)
                                    setShowAssignModal(true)
                                  }}
                                  className="h-7 px-2.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30 rounded-lg text-xs"
                                >
                                  Assign User
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM HEALTH TAB */}
          {activeTab === "health" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {health && health.services ? (
                  Object.entries(health.services).map(([name, data]: any) => (
                    <Card key={name} className="bg-black/30 border-border/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.05)] transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{name} Server</CardTitle>
                        <span className={`w-3 h-3 rounded-full ${
                          data.status === "Green" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : (data.status === "Yellow" ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" : "bg-rose-400 shadow-[0_0_8px_#f87171]")
                        }`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-white">{data.status === "Green" ? "HEALTHY" : (data.status === "Yellow" ? "DEGRADED" : "OFFLINE")}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{data.details}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-6 text-center col-span-4">No diagnostic metrics populated. Try syncing registry.</div>
                )}
              </div>

              {/* Health Action Monitor */}
              <Card className="bg-black/30 border-border/40">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Diagnostics & Service Status
                  </CardTitle>
                  <CardDescription>Perform active connection probes to underlying microservices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={async () => {
                      setLoading(true)
                      await fetchHealth()
                      setLoading(false)
                    }} 
                    disabled={loading} 
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs rounded-lg h-9"
                  >
                    Run Health Diagnostics
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* BACKUP & DISASTER RECOVERY TAB */}
          {activeTab === "backups" && (
            <div className="space-y-6">
              {/* Disaster Recovery Switches */}
              <Card className="bg-black/30 border-border/40">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    System Disaster Recovery Controls
                  </CardTitle>
                  <CardDescription>Shut down, place read-only boundaries, or start maintenance operations</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  {[
                    { key: "MAINTENANCE_MODE", label: "Maintenance Mode", desc: "Locks dashboard logins, displays maintenance banners." },
                    { key: "READ_ONLY_MODE", label: "Read-Only Mode", desc: "Blocks all write requests (POST, PUT, DELETE, PATCH)." },
                    { key: "EMERGENCY_SHUTDOWN", label: "Emergency Shutdown", desc: "Instantly suspends all background queues, webhooks, and routing." }
                  ].map((cfg) => {
                    const active = sysConfig[cfg.key] === "true"
                    return (
                      <div key={cfg.key} className="bg-black/40 p-4 rounded-xl border border-border/40 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-white">{cfg.label}</span>
                            <Badge className={active ? "bg-rose-500/20 text-rose-400 border-rose-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}>
                              {active ? "ON" : "OFF"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">{cfg.desc}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleToggleSysConfig(cfg.key, sysConfig[cfg.key])}
                          className={`w-full font-semibold text-xs rounded-lg h-8 ${
                            active ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-rose-600 hover:bg-rose-700 text-white"
                          }`}
                        >
                          {active ? "Deactivate Mode" : "Activate Mode"}
                        </Button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Database Backups List */}
              <Card className="bg-black/30 border-border/40">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-cyan-400" />
                      Database Snapshot Backups
                    </CardTitle>
                    <CardDescription>Capture secure portable JSON snapshots of all database records</CardDescription>
                  </div>
                  <Button onClick={handleCreateBackup} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs rounded-lg h-9">
                    Take Snapshot
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-black/20 text-xs">
                    <Table>
                      <TableHeader className="bg-white/[0.02]">
                        <TableRow>
                          <TableHead className="text-muted-foreground">Snapshot File</TableHead>
                          <TableHead className="text-muted-foreground">Size</TableHead>
                          <TableHead className="text-muted-foreground">Status</TableHead>
                          <TableHead className="text-muted-foreground">Created At</TableHead>
                          <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backups.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No backup snapshots recorded on disk
                            </TableCell>
                          </TableRow>
                        ) : (
                          backups.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono text-cyan-400">{b.filename}</TableCell>
                              <TableCell>{(b.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                              <TableCell>
                                <Badge className={b.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}>
                                  {b.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(b.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                {b.status === "COMPLETED" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownloadBackup(b.id, b.filename)}
                                      className="h-7 px-2.5 rounded-lg border-border/40 hover:bg-white/5 text-gray-300"
                                    >
                                      <Download className="w-3.5 h-3.5 mr-1" /> Download
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setRestoreBackupId(b.id)
                                        setConfirmPassword("")
                                        setShowRestoreModal(true)
                                      }}
                                      className="h-7 px-2.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30 rounded-lg"
                                    >
                                      Restore
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteBackup(b.id)}
                                  className="h-7 px-2 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black border-red-500/30 rounded-lg text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SYSTEM AUDIT LOGS TAB */}
          {activeTab === "logs" && (
            <Card className="bg-black/30 border-border/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Audit Trail Logs</CardTitle>
                  <CardDescription>Live system records showing admin and tenant interactions</CardDescription>
                </div>
                <FileText className="w-8 h-8 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="bg-black/80 rounded-xl p-4 border border-white/5 font-mono text-[11px] leading-relaxed text-cyan-500/90 h-[500px] overflow-y-auto custom-scrollbar select-text space-y-2">
                  {logs.length === 0 ? (
                    <div className="text-center text-muted-foreground pt-12">No audit log entries recorded in database.</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="border-b border-white/[0.03] pb-1 hover:bg-white/[0.01] transition-all">
                        <span className="text-muted-foreground/60">[{new Date(log.createdAt).toISOString()}]</span>{" "}
                        <span className="text-cyan-400 font-bold">{log.action}</span>{" "}
                        {log.user && (
                          <span className="text-purple-400">({log.user.name} / {log.user.email})</span>
                        )}{" "}
                        <span className="text-white">{log.details}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* PLAN CRUD MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0c10] border border-border/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.15)] relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">{modalPlan ? "Modify SaaS Plan" : "Create New SaaS Plan"}</h3>
            <p className="text-xs text-muted-foreground">Define limits and feature configurations for billing tiers.</p>

            <form onSubmit={handleSavePlan} className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Plan Name</label>
                  <Input
                    placeholder="Growth"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Duration (Days)</label>
                  <Input
                    type="number"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) || 30 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Monthly Price (USD/PKR)</label>
                  <Input
                    type="number"
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Yearly Price (USD/PKR)</label>
                  <Input
                    type="number"
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Max Orders / Month</label>
                  <Input
                    type="number"
                    value={planForm.maxOrders}
                    onChange={(e) => setPlanForm({ ...planForm, maxOrders: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Max Messages / Month</label>
                  <Input
                    type="number"
                    value={planForm.maxMessages}
                    onChange={(e) => setPlanForm({ ...planForm, maxMessages: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground uppercase">Max Templates</label>
                  <Input
                    type="number"
                    value={planForm.maxTemplates}
                    onChange={(e) => setPlanForm({ ...planForm, maxTemplates: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground uppercase">Max Automations</label>
                  <Input
                    type="number"
                    value={planForm.maxAutomations}
                    onChange={(e) => setPlanForm({ ...planForm, maxAutomations: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground uppercase">Max Sessions</label>
                  <Input
                    type="number"
                    value={planForm.maxSessions}
                    onChange={(e) => setPlanForm({ ...planForm, maxSessions: Number(e.target.value) || 0 })}
                    required
                    className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">Enable Features (JSON Format)</label>
                <Input
                  placeholder='["WHITELABEL", "API_ACCESS"]'
                  value={JSON.stringify(planForm.features)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      if (Array.isArray(parsed)) {
                        setPlanForm({ ...planForm, features: parsed })
                      }
                    } catch (err) {}
                  }}
                  className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-9 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPlanModal(false)
                    setModalPlan(null)
                  }}
                  className="border-border/40 hover:bg-white/5 cursor-pointer rounded-lg h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg h-9 text-xs">
                  Save Billing Tier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURE PASSWORD CONFIRMED DATABASE RESTORE MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0c10] border border-border/50 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.25)] relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              <h3 className="text-lg font-bold">Secure Database Restore</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              WARNING: Restoring will delete all current database records and overwrite them with the snapshot records. Confirm with your Super Admin password.
            </p>

            <form onSubmit={handleRestoreBackup} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase">Enter Admin Password</label>
                <Input
                  type="password"
                  placeholder="Super Admin Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-black/40 border-border/40 focus:border-rose-500 text-white rounded-lg h-10"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRestoreModal(false)
                    setConfirmPassword("")
                    setRestoreBackupId("")
                  }}
                  className="border-border/40 hover:bg-white/5 cursor-pointer rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs">
                  Restore Snapshot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {showPasswordModal && modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0c10] border border-border/50 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.15)] relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">Reset User Password</h3>
            <p className="text-xs text-muted-foreground">
              Enter a new secure password for <strong className="text-white">{modalUser.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <Input
                type="password"
                placeholder="New secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-10"
              />

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setModalUser(null)
                  }}
                  className="border-border/40 hover:bg-white/5 cursor-pointer rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg text-xs">
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND SUBSCRIPTION MODAL */}
      {showExtendModal && modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0c10] border border-border/50 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.15)] relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">Extend Subscription Plan</h3>
            <p className="text-xs text-muted-foreground">
              Specify how many days to append to the expiry date of <strong className="text-white">{modalUser.email}</strong>.
            </p>

            <form onSubmit={handleExtendSubscription} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase">Extension Days</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  required
                  min={1}
                  className="bg-black/40 border-border/40 focus:border-cyan-400 text-white rounded-lg h-10"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExtendModal(false)
                    setModalUser(null)
                  }}
                  className="border-border/40 hover:bg-white/5 cursor-pointer rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg text-xs">
                  Apply Extension
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN LICENSE MODAL */}
      {showAssignModal && modalLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0c10] border border-border/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.15)] relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">Assign License Key</h3>
            <p className="text-xs text-muted-foreground">
              Assign key <strong className="text-cyan-400">{modalLicense.key}</strong> ({modalLicense.duration}) to a tenant.
            </p>

            <form onSubmit={handleAssignLicense} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase">Select User Account</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-black/40 border border-border/40 text-white focus:border-cyan-400 text-sm focus:outline-none"
                >
                  <option value="">-- Choose User --</option>
                  {users
                    .filter((u) => u.role !== "SUPERADMIN")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignModal(false)
                    setModalLicense(null)
                    setAssignUserId("")
                  }}
                  className="border-border/40 hover:bg-white/5 cursor-pointer rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!assignUserId} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg text-xs">
                  Activate & Assign Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
