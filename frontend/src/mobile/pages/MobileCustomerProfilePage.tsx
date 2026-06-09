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
  Loader2,
  AlertCircle
} from "lucide-react"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"

interface MobileCustomerProfilePageProps {
  customerId: string
}

export default function MobileCustomerProfilePage({ customerId }: MobileCustomerProfilePageProps) {
  const router = useRouter()
  const [customer, setCustomer] = React.useState<any>(null)
  const [orders, setOrders] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = async () => {
    try {
      const customerRes = await apiFetch(`/customers/${customerId}`)
      if (!customerRes.ok) {
        if (customerRes.status === 404) {
          throw new Error("Customer not found")
        }
        throw new Error("Failed to fetch customer details")
      }
      const customerData = await customerRes.json()
      setCustomer(customerData)

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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="text-sm text-gray-400 mt-4">Loading profile...</p>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-bold text-white">Error</h3>
        <p className="text-sm text-gray-400">{error || "Customer profile could not be loaded."}</p>
        <Button onClick={() => router.push("/customers")} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-4 space-y-6 pb-24 h-full relative">
      <header className="flex items-center gap-3 pt-8 pb-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push("/customers")} 
          className="border-gray-800 bg-gray-900/50 hover:bg-gray-800 rounded-full w-8 h-8 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{customer.name}</h1>
          <p className="text-xs text-gray-400">Customer Details</p>
        </div>
      </header>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gray-900/50 border-gray-800 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Spend</p>
          <p className="text-base font-bold text-cyan-400 mt-1">Rs {customer.totalSpending.toLocaleString()}</p>
        </Card>
        <Card className="bg-gray-900/50 border-gray-800 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Orders</p>
          <p className="text-base font-bold text-white mt-1">{customer.totalOrders}</p>
        </Card>
        <Card className="bg-gray-900/50 border-gray-800 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Confirm Rate</p>
          <p className="text-base font-bold text-green-500 mt-1">{customer.confirmationRate}%</p>
        </Card>
        <Card className="bg-gray-900/50 border-gray-800 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cancelled</p>
          <p className="text-base font-bold text-red-500 mt-1">{customer.cancelledOrders}</p>
        </Card>
      </div>

      {/* Profile Detail List */}
      <Card className="bg-gray-900/30 border-gray-800 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 border-b border-gray-800 pb-2">Profile Information</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 text-xs">
            <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Phone</p>
              <p className="text-gray-200">{customer.phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-xs">
            <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Email</p>
              <p className="text-gray-200">{customer.email || "N/A"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-xs">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Member Since</p>
              <p className="text-gray-200">{new Date(customer.customerSince).toLocaleDateString()}</p>
            </div>
          </div>
          {customer.shippingAddress && (
            <div className="flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">Shipping Address</p>
                <p className="text-gray-200">{customer.shippingAddress}</p>
                <p className="text-gray-400 text-[10px]">
                  {[customer.city, customer.province, customer.postalCode, customer.country].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Order List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Order History</h2>
        {orders.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">No orders recorded</p>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="bg-gray-900/50 border-gray-800 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-cyan-400">{order.orderName || `#${order.id.substring(0, 4)}`}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{order.product}</p>
                </div>
                <span className="text-xs font-bold text-white">Rs {order.amount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-gray-800/50 pt-2.5">
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  {order.status === "CONFIRMED" && (
                    <span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-sm">Confirmed</span>
                  )}
                  {order.status === "PENDING" && (
                    <span className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-sm">Pending</span>
                  )}
                  {order.status === "CANCELLED" && (
                    <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-sm">Cancelled</span>
                  )}
                </div>
              </div>

              {order.status === "PENDING" && (
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                    className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                    className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-red-500 rounded-md text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
