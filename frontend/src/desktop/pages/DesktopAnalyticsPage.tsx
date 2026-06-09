"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts"
import { Loader2, Users, RefreshCw, BarChart2, DollarSign } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

export default function AnalyticsPage() {
  const [stats, setStats] = React.useState<any>(null)
  const [chartData, setChartData] = React.useState<any[]>([])
  const [products, setProducts] = React.useState<any[]>([])
  const [customerData, setCustomerData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchDashboardData = async () => {
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
      console.error("Failed to fetch analytics data:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 4000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex-1 space-y-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    )
  }

  const engagementData = stats ? [
    { name: "Confirmed", value: stats.confirmedOrders, color: "hsl(186, 100%, 40%)" },
    { name: "Pending", value: stats.pendingOrders, color: "hsl(43, 100%, 50%)" },
    { name: "Cancelled", value: stats.cancelledOrders, color: "hsl(0, 84%, 60%)" },
  ] : []

  const totalProcessed = stats ? (stats.confirmedOrders + stats.pendingOrders + stats.cancelledOrders) : 0
  const confirmRate = stats?.confirmationRate || 0
  const cancelRate = stats?.cancellationRate || 0

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>

      {/* Top Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmation Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">{confirmRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average confirmed orders</p>
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{cancelRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average cancelled orders</p>
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
            <RefreshCw className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{customerData?.repeatCustomerRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">{customerData?.repeatCustomersCount || 0} repeat customers</p>
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerData?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique shoppers in DB</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Monthly Orders</CardTitle>
            <CardDescription>
              Orders volume over the current year.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(186, 100%, 40%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(186, 100%, 40%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="orders" stroke="hsl(186, 100%, 40%)" fillOpacity={1} fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Order Engagement</CardTitle>
            <CardDescription>
              Breakdown of order statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-3xl font-bold text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">{confirmRate}%</span>
                <span className="text-sm text-muted-foreground">Confirm Rate</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue trajectory.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs ${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '8px' }}
                    formatter={(value: any) => [`Rs ${value}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(186, 100%, 40%)" 
                    strokeWidth={3} 
                    dot={{ fill: 'hsl(186, 100%, 40%)', strokeWidth: 2, r: 6 }} 
                    activeDot={{ r: 8, fill: 'hsl(186, 100%, 50%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Confirmations vs Cancellations</CardTitle>
            <CardDescription>Comparison of verified confirmations against cancellation metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="confirmations" fill="hsl(186, 100%, 40%)" name="Confirmations" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancellations" fill="hsl(0, 84%, 60%)" name="Cancellations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 tables: Top products and spenders */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Product-wise metrics calculated from real order distributions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white font-semibold">Product Name</TableHead>
                    <TableHead className="text-right text-white font-semibold">Total Sales</TableHead>
                    <TableHead className="text-right text-white font-semibold">Confirmations</TableHead>
                    <TableHead className="text-right text-white font-semibold">Cancellations</TableHead>
                    <TableHead className="text-right text-white font-semibold">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length > 0 ? (
                    products.map((p, idx) => (
                      <TableRow key={idx} className="hover:bg-cyan-500/5 transition-colors border-border/40">
                        <TableCell className="font-medium text-white">{p.product}</TableCell>
                        <TableCell className="text-right">{p.totalSales}</TableCell>
                        <TableCell className="text-right text-primary font-semibold">{p.confirmations}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">{p.cancellations}</TableCell>
                        <TableCell className="text-right font-medium text-white">Rs {p.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No product data found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Top Spenders</CardTitle>
            <CardDescription>High spenders and individual WhatsApp confirm rates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white font-semibold">Customer</TableHead>
                    <TableHead className="text-right text-white font-semibold">Orders</TableHead>
                    <TableHead className="text-right text-white font-semibold">Confirm %</TableHead>
                    <TableHead className="text-right text-white font-semibold">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerData?.topSpenders && customerData.topSpenders.length > 0 ? (
                    customerData.topSpenders.map((c: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-cyan-500/5 transition-colors border-border/40">
                        <TableCell className="font-medium text-white">
                          <div>
                            <div className="font-medium text-white">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{c.orderCount}</TableCell>
                        <TableCell className="text-right text-primary font-semibold">{c.confirmationRate}%</TableCell>
                        <TableCell className="text-right font-medium text-white">Rs {c.totalSpent.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No top spenders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
