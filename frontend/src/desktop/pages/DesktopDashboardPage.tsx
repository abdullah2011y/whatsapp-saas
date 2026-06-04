"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Overview } from "@/shared/components/dashboard/overview"
import { RecentActivity } from "@/shared/components/dashboard/recent-activity"
import { DollarSign, ShoppingCart, CheckCircle2, XCircle, TrendingUp, Activity, Loader2 } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = React.useState<any>(null)
  const [chartData, setChartData] = React.useState<any[]>([])
  const [activities, setActivities] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchDashboardData = async () => {
    try {
      const [statsRes, analyticsRes, activityRes] = await Promise.all([
        fetch("http://localhost:5000/dashboard/stats"),
        fetch("http://localhost:5000/analytics"),
        fetch("http://localhost:5000/activity")
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
