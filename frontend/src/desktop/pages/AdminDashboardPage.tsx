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
  ChevronRight,
  ExternalLink,
  Laptop
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { apiFetch } from "@/shared/lib/api/client"

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<"overview" | "users" | "licenses" | "logs">("overview")
  const [stats, setStats] = React.useState<any>(null)
  const [users, setUsers] = React.useState<any[]>([])
  const [licenses, setLicenses] = React.useState<any[]>([])
  const [logs, setLogs] = React.useState<any[]>([])
  
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Modal State
  const [modalUser, setModalUser] = React.useState<any>(null)
  const [showPasswordModal, setShowPasswordModal] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")

  const [showExtendModal, setShowExtendModal] = React.useState(false)
  const [extendDays, setExtendDays] = React.useState(30)

  const [modalLicense, setModalLicense] = React.useState<any>(null)
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assignUserId, setAssignUserId] = React.useState("")

  // License Generation State
  const [generateDuration, setGenerateDuration] = React.useState("1 Month")

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
    await Promise.all([fetchStats(), fetchUsers(), fetchLicenses(), fetchLogs()])
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

  // License Actions
  const handleGenerateLicense = async () => {
    try {
      const res = await apiFetch("/admin/licenses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: generateDuration })
      })
      if (res.ok) {
        fetchLicenses()
        fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to generate license key")
      }
    } catch (err) {
      console.error("License key generation error:", err)
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
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">Global Dashboard</h2>
        </div>
        <Button onClick={loadData} disabled={loading} size="sm" variant="outline" className="border-border/40 hover:bg-white/5 cursor-pointer">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-border/30 gap-2">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "users", label: "User Accounts", icon: Users },
          { id: "licenses", label: "Licenses Management", icon: Key },
          { id: "logs", label: "System Logs", icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/10"
                : "border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
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
              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { title: "Total Users", value: stats.totalUsers, desc: "Registered customers", icon: Users, color: "text-cyan-400" },
                  { title: "Active Licenses", value: stats.activeUsers, desc: "Premium subscribers", icon: Shield, color: "text-emerald-400" },
                  { title: "Expired/Unlicensed", value: stats.expiredUsers, desc: "Limited access", icon: Clock, color: "text-amber-400" },
                  { title: "WhatsApp Connected", value: stats.whatsappConnected, desc: "Active phone sessions", icon: Laptop, color: "text-cyan-400" },
                  { title: "Shopify Connected", value: stats.shopifyConnected, desc: "Connected web stores", icon: ExternalLink, color: "text-cyan-400" }
                ].map((s, i) => (
                  <Card key={i} className="bg-black/30 border-border/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.title}</CardTitle>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-extrabold text-white">{s.value}</div>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Revenue Card Row */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-black/30 border-border/40">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Monthly Revenue</CardTitle>
                      <CardDescription>Confirmed Shopify & WhatsApp sales this calendar month</CardDescription>
                    </div>
                    <Coins className="w-8 h-8 text-cyan-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-extrabold text-cyan-400">
                      Rs {stats.monthlyRevenue.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/30 border-border/40">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Total Revenue</CardTitle>
                      <CardDescription>Cumulative confirmed sales revenue across all tenants</CardDescription>
                    </div>
                    <Coins className="w-8 h-8 text-emerald-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-extrabold text-emerald-400">
                      Rs {stats.totalRevenue.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Flow metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: "Total Orders", value: stats.totalOrders, icon: Activity, color: "text-cyan-400" },
                  { title: "Confirmed Orders", value: stats.confirmedOrders, icon: CheckCircle2, color: "text-emerald-400" },
                  { title: "Cancelled Orders", value: stats.cancelledOrders, icon: XCircle, color: "text-rose-400" }
                ].map((stat, idx) => (
                  <Card key={idx} className="bg-black/20 border-border/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs text-muted-foreground uppercase">{stat.title}</CardTitle>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users, emails, companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-black/40 border-border/40 focus:border-cyan-400 rounded-xl"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} registered accounts
                </div>
              </div>

              <div className="border border-border/40 rounded-xl overflow-hidden bg-black/20">
                <Table>
                  <TableHeader className="bg-white/[0.02]">
                    <TableRow>
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Company</TableHead>
                      <TableHead className="text-muted-foreground">Reg. Date</TableHead>
                      <TableHead className="text-muted-foreground">Plan</TableHead>
                      <TableHead className="text-muted-foreground">License Key</TableHead>
                      <TableHead className="text-muted-foreground">Expiry</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No users found matching query
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
                              user.plan === "Lifetime" ? (
                                "Never"
                              ) : (
                                new Date(user.expiresAt).toLocaleDateString()
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                            {user.status === "ARCHIVED" || user.status === "SUSPENDED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreUser(user.id)}
                                className="h-7 px-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 rounded-lg text-xs"
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusToggle(user.id, user.status)}
                                className="h-7 px-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30 rounded-lg text-xs"
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
                              className="h-7 px-2.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30 rounded-lg text-xs"
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
                              className="h-7 px-2.5 border-border/40 hover:bg-white/5 rounded-lg text-xs text-gray-300"
                            >
                              Reset PW
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.id)}
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
                    Generate License
                  </CardTitle>
                  <CardDescription>Create a cryptographically unique activation license code.</CardDescription>
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

                  <Button onClick={handleGenerateLicense} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate License Key
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
