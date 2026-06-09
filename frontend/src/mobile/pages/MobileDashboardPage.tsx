"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { DollarSign, ShoppingCart, CheckCircle2, TrendingUp, Activity, XCircle, Loader2 } from "lucide-react"

export default function MobileDashboardPage() {
  const [stats, setStats] = React.useState<any>(null)
  const [activities, setActivities] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        apiFetch("/dashboard/stats"),
        apiFetch("/activity")
      ])
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
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
      title: "Revenue",
      value: `Rs ${stats.totalRevenue > 1000000 ? (stats.totalRevenue/1000000).toFixed(1) + 'M' : stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      trend: "up"
    },
    {
      title: "Pending",
      value: stats.pendingOrders.toString(),
      icon: Activity,
      trend: "up"
    },
    {
      title: "Confirmed",
      value: stats.confirmedOrders.toString(),
      icon: CheckCircle2,
      trend: "up"
    },
    {
      title: "Cancelled",
      value: stats.cancelledOrders.toString(),
      icon: XCircle,
      trend: "down"
    },
    {
      title: "Confirm. %",
      value: `${stats.confirmationRate}%`,
      icon: TrendingUp,
      trend: "up"
    },
    {
      title: "Cancel. %",
      value: `${stats.cancellationRate}%`,
      icon: XCircle,
      trend: "down"
    }
  ] : []

  return (
    <div className="flex flex-col p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between pt-8 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-sm text-gray-400">Welcome back to WhatsApp SaaS</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
          <span className="text-cyan-400 font-bold">JD</span>
        </div>
      </header>

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Horizontal Scrollable Stats */}
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 custom-scrollbar snap-x snap-mandatory">
            {statCards.map((stat, i) => (
              <Card key={i} className="min-w-[140px] snap-center bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm flex-shrink-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.trend === 'up' ? 'text-cyan-400' : 'text-red-400'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 text-sm text-gray-300">
              {activities && activities.length > 0 ? (
                activities.map((activity: any, idx: number) => {
                  const isConfirmed = activity.type === "CONFIRMED";
                  const isCancelled = activity.type === "CANCELLED";
                  
                  return (
                    <div key={activity.id} className={`flex justify-between items-center py-3 ${idx !== activities.length - 1 ? 'border-b border-gray-800' : ''}`}>
                      <div className="flex flex-col min-w-0 pr-4 flex-1">
                        <span className="font-medium text-gray-200 truncate">{activity.message}</span>
                      </div>
                      <span className={`text-xs shrink-0 ${isConfirmed ? 'text-cyan-400' : isCancelled ? 'text-red-400' : 'text-yellow-500'}`}>
                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="py-4 text-center text-gray-500 text-xs">No recent activity</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
