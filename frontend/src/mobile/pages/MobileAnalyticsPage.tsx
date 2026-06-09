"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { Card } from "@/shared/components/ui/card"
import { TrendingUp, Activity, DollarSign, ShoppingCart, XCircle, CheckCircle2, Loader2 } from "lucide-react"

export default function MobileAnalyticsPage() {
  const [stats, setStats] = React.useState<any>(null)
  const [chartData, setChartData] = React.useState<any[]>([])
  const [products, setProducts] = React.useState<any[]>([])
  const [customerData, setCustomerData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchAnalytics = async () => {
    try {
      const [statsRes, analyticsRes, productsRes, customersRes] = await Promise.all([
        apiFetch("/dashboard/stats"),
        apiFetch("/analytics"),
        apiFetch("/analytics/products"),
        apiFetch("/analytics/customers")
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setChartData(analyticsData)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }

      if (customersRes.ok) {
        const custData = await customersRes.json()
        setCustomerData(custData)
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 4000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full pb-24">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    )
  }

  const confirmRate = stats?.confirmationRate || 0
  const cancelRate = stats?.cancellationRate || 0

  return (
    <div className="flex flex-col p-4 space-y-6 pb-24 h-full overflow-y-auto">
      <header className="pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-400">Live metrics from your database</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 flex flex-col justify-between aspect-square">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{confirmRate}%</div>
            <div className="text-xs text-gray-400 mt-1">Confirm Rate</div>
          </div>
        </Card>
        <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 flex flex-col justify-between aspect-square">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{cancelRate}%</div>
            <div className="text-xs text-gray-400 mt-1">Cancel Rate</div>
          </div>
        </Card>
        <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 flex flex-col justify-between aspect-square">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats?.totalOrders || 0}</div>
            <div className="text-xs text-gray-400 mt-1">Total Orders</div>
          </div>
        </Card>
        <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 flex flex-col justify-between aspect-square">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">Rs {stats?.totalRevenue?.toLocaleString() || 0}</div>
            <div className="text-xs text-gray-400 mt-1">Total Revenue</div>
          </div>
        </Card>
      </div>

      {/* Monthly Revenue Breakdown */}
      <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Monthly Revenue</h3>
        <div className="space-y-2">
          {chartData.filter(m => m.total > 0 || m.orders > 0).length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No revenue data yet for this year</p>
          ) : (
            chartData.filter(m => m.total > 0 || m.orders > 0).map((month) => {
              const maxRevenue = Math.max(...chartData.map(m => m.total), 1)
              const barWidth = Math.max((month.total / maxRevenue) * 100, 4)
              return (
                <div key={month.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8 flex-shrink-0">{month.name}</span>
                  <div className="flex-1 h-5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-20 text-right flex-shrink-0">Rs {month.total.toLocaleString()}</span>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Status Breakdown */}
      <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Status Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-300">Confirmed</span>
            </div>
            <span className="text-sm font-bold text-cyan-400">{stats?.confirmedOrders || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Pending</span>
            </div>
            <span className="text-sm font-bold text-yellow-400">{stats?.pendingOrders || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">Cancelled</span>
            </div>
            <span className="text-sm font-bold text-red-400">{stats?.cancelledOrders || 0}</span>
          </div>
        </div>
      </Card>

      {/* Top Products */}
      <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Products</h3>
        <div className="space-y-3">
          {products.length > 0 ? (
            products.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-200 truncate">{p.product}</span>
                  <span className="text-xs text-gray-500">Sales: {p.totalSales} | Confirm: {p.confirmations} | Cancel: {p.cancellations}</span>
                </div>
                <span className="text-sm font-bold text-white shrink-0">Rs {p.revenue.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">No product sales yet</p>
          )}
        </div>
      </Card>

      {/* Top Spenders */}
      <Card className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Spenders</h3>
        <div className="space-y-3">
          {customerData?.topSpenders && customerData.topSpenders.length > 0 ? (
            customerData.topSpenders.map((c: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-200 truncate">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.phone} • {c.orderCount} orders • {c.confirmationRate}% confirm</span>
                </div>
                <span className="text-sm font-bold text-cyan-400 shrink-0">Rs {c.totalSpent.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">No customer data yet</p>
          )}
        </div>
      </Card>
    </div>
  )
}
