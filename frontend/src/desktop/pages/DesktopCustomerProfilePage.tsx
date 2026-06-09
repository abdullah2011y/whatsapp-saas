"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Loader2,
  AlertCircle
} from "lucide-react"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

interface DesktopCustomerProfilePageProps {
  customerId: string
}

export default function DesktopCustomerProfilePage({ customerId }: DesktopCustomerProfilePageProps) {
  const router = useRouter()
  const [customer, setCustomer] = React.useState<any>(null)
  const [orders, setOrders] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = async () => {
    try {
      // Fetch customer details
      const customerRes = await apiFetch(`/customers/${customerId}`)
      if (!customerRes.ok) {
        if (customerRes.status === 404) {
          throw new Error("Customer not found")
        }
        throw new Error("Failed to fetch customer details")
      }
      const customerData = await customerRes.json()
      setCustomer(customerData)

      // Fetch customer orders
      const ordersRes = await apiFetch(`/customers/${customerId}/orders`)
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData)
      }
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 4000)
    return () => clearInterval(interval)
  }, [customerId])

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
      
      const res = await apiFetch(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error("Failed to update status:", err)
      fetchData()
    }
  }

  if (loading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="text-sm text-muted-foreground mt-4">Loading customer profile...</p>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="text-xl font-bold text-white">Error</h3>
        <p className="text-muted-foreground">{error || "Customer profile could not be loaded."}</p>
        <Button onClick={() => router.push("/customers")} variant="outline" className="border-border/40">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push("/customers")} 
          className="border-border/50 bg-background/50 hover:bg-accent/50 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">Customer Profile Overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Customer Information */}
        <Card className="bg-background/50 backdrop-blur-sm border-border/50 shadow-sm p-6 space-y-6 h-fit">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-border/30 pb-2">Customer Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="text-sm font-medium text-white">{customer.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-sm font-medium text-white">{customer.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer Since</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(customer.customerSince).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Order Date</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(customer.lastOrderDate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-border/30 pb-2">Shipping Address</h3>
            {customer.shippingAddress ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{customer.shippingAddress}</p>
                    <p className="text-sm text-gray-400">
                      {[customer.city, customer.province, customer.postalCode, customer.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No shipping address recorded</p>
            )}
          </div>
        </Card>

        {/* Right Side: Metrics Grid & Order History */}
        <div className="md:col-span-2 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-background/50 backdrop-blur-sm border-border/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Spending</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">Rs {customer.totalSpending.toLocaleString()}</p>
            </Card>

            <Card className="bg-background/50 backdrop-blur-sm border-border/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-white mt-1">{customer.totalOrders}</p>
            </Card>

            <Card className="bg-background/50 backdrop-blur-sm border-border/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Confirm Rate</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-green-500">{customer.confirmationRate}%</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </Card>

            <Card className="bg-background/50 backdrop-blur-sm border-border/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Cancelled Orders</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{customer.cancelledOrders}</p>
            </Card>
          </div>

          {/* Orders History Table */}
          <Card className="bg-background/50 backdrop-blur-sm border-border/50 shadow-sm p-4">
            <h3 className="text-lg font-bold text-white mb-4">Order History</h3>
            <div className="rounded-md border border-border/40 bg-accent/10 min-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead>Order Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Confirmation Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        No orders recorded for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id} className="border-border/40 hover:bg-accent/30 transition-colors">
                        <TableCell className="font-semibold text-cyan-400">
                          {order.orderName || `#${order.id.substring(0, 4)}`}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={order.product}>
                          {order.product}
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          Rs {order.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {order.status === "CONFIRMED" && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1.5">
                              <CheckCircle2 className="h-3 w-3" /> Confirmed
                            </Badge>
                          )}
                          {order.status === "PENDING" && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1.5">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                          {order.status === "CANCELLED" && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5">
                              <XCircle className="h-3 w-3" /> Cancelled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {order.status === "PENDING" && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-2 py-1 h-7"
                              >
                                Confirm
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                                className="border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs px-2 py-1 h-7"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {order.status !== "PENDING" && (
                            <span className="text-xs text-muted-foreground italic">Processed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
