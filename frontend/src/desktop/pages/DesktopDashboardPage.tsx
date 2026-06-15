"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Overview } from "@/shared/components/dashboard/overview"
import { RecentActivity } from "@/shared/components/dashboard/recent-activity"
import { DollarSign, ShoppingCart, CheckCircle2, XCircle, TrendingUp, Activity, Loader2, Clock, Lock, Shield, Sparkles } from "lucide-react"
import { useAuth } from "@/shared/lib/auth"

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = React.useState<any>(null)
  const [chartData, setChartData] = React.useState<any[]>([])
  const [activities, setActivities] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const isLicensed = React.useMemo(() => {
    if (!user) return false
    if (user.role === "SUPERADMIN") return true
    if (user.status === "ARCHIVED") return false
    if (user.plan === "Lifetime") return true
    if (!user.expiresAt) return false
    return new Date(user.expiresAt) > new Date()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, analyticsRes, activityRes] = await Promise.all([
        apiFetch("/dashboard/stats"),
        apiFetch("/analytics"),
        apiFetch("/activity")
      ])
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setChartData(analyticsData)
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setActivities(activityData)
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 4000)
    return () => clearInterval(interval)
  }, [])

  const statCards = stats ? [
    {
      title: "Total Revenue",
      value: `Rs ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      trend: "up"
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      icon: Activity,
      trend: "up"
    },
    {
      title: "Confirmed Orders",
      value: stats.confirmedOrders.toString(),
      icon: CheckCircle2,
      trend: "up"
    },
    {
      title: "Cancelled Orders",
      value: stats.cancelledOrders.toString(),
      icon: XCircle,
      trend: "down"
    },
    {
      title: "Confirmation Rate",
      value: `${stats.confirmationRate}%`,
      icon: TrendingUp,
      trend: "up"
    },
    {
      title: "Cancellation Rate",
      value: `${stats.cancellationRate}%`,
      icon: XCircle,
      trend: "down"
    }
  ] : []

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
      </div>
      
      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Subscription Status Widget */}
          {user && (
            <div className="mb-6">
              {user.role === "SUPERADMIN" ? (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-400 animate-pulse" />
                  <div>
                    <span className="font-bold text-white">Super Admin Control Center</span>
                    <p className="text-xs text-muted-foreground">You have unrestricted access to all modules and configurations across the SaaS tenant registry.</p>
                  </div>
                </div>
              ) : user.status === "ARCHIVED" ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                  <Clock className="w-5 h-5 text-amber-400 animate-bounce" />
                  <div>
                    <span className="font-bold text-white">Account Status: ARCHIVED</span>
                    <p className="text-xs text-muted-foreground">Your premium subscription expired over 30 days ago. Features are locked, but your database records are preserved. Contact support to restore access.</p>
                  </div>
                </div>
              ) : !isLicensed || user.status === "INACTIVE" ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
                  <Lock className="w-5 h-5 text-rose-400" />
                  <div>
                    <span className="font-bold text-white">Subscription expired.</span>
                    <p className="text-xs text-muted-foreground">Renew to restore premium features.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-white">Premium License Active — {user.plan} Plan</span>
                      <p className="text-xs text-muted-foreground">
                        License: <span className="font-mono text-cyan-300 font-semibold">{user.licenseKey}</span> • Expiry: {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, i) => (
              <Card key={i} className="bg-background/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.trend === 'up' ? 'text-primary' : 'text-destructive'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  Confirmed revenue grouped by month.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview data={chartData} />
              </CardContent>
            </Card>
            
            <Card className="col-span-3 bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Live updates from incoming orders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity data={activities} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
