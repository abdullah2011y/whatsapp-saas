"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { Card } from "@/shared/components/ui/card"
import { Search, Filter, MoreVertical, Package, Loader2, PackageX, User } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MobileOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("All")
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)
  const [selectedOrderDetails, setSelectedOrderDetails] = React.useState<any>(null)
  const [loadingDetails, setLoadingDetails] = React.useState(false)
  const [courierName, setCourierName] = React.useState("")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [isSavingDetails, setIsSavingDetails] = React.useState(false)

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const fetchOrders = async (query?: string) => {
    try {
      const endpoint = query 
        ? `/orders?search=${encodeURIComponent(query)}`
        : `/orders`
      const res = await apiFetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchOrders(debouncedSearchQuery)
    const interval = setInterval(() => {
      fetchOrders(debouncedSearchQuery)
    }, 4000)
    return () => clearInterval(interval)
  }, [debouncedSearchQuery])

  const fetchOrderDetails = async (id: string) => {
    setSelectedOrderId(id)
    setLoadingDetails(true)
    try {
      const res = await apiFetch(`/orders/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedOrderDetails(data)
        setCourierName(data.courierName || "")
        setTrackingNumber(data.trackingNumber || "")
      }
    } catch (err) {
      console.error("Failed to fetch order details:", err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeDetailsModal = () => {
    setSelectedOrderId(null)
    setSelectedOrderDetails(null)
  }

  const saveOrderDetails = async () => {
    if (!selectedOrderDetails) return
    setIsSavingDetails(true)
    try {
      const res = await apiFetch(`/orders/${selectedOrderDetails.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selectedOrderDetails.status,
          trackingNumber,
          courierName
        })
      })
      if (res.ok) {
        fetchOrders()
        closeDetailsModal()
      } else {
        alert("Failed to update order details")
      }
    } catch (err) {
      console.error(err)
      alert("Error updating order details")
    } finally {
      setIsSavingDetails(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (filterStatus === "All") return true
    return o.status === filterStatus.toUpperCase().replace(/ /g, "_")
  })

  return (
    <div className="flex flex-col p-4 space-y-4 pb-24 h-full relative">
      <header className="flex items-center justify-between pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Orders</h1>
        <div className="flex gap-3 text-cyan-400">
          <Filter className="w-5 h-5" />
        </div>
      </header>

      <div className="relative w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search order ID, customer, phone, product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
        {["All", "Pending", "Confirmed", "Cancelled", "Shipped", "Out for Delivery", "Delivered"].map(status => (
          <button 
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${filterStatus === status ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-300'}`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-gray-400 text-sm mt-4">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <PackageX className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white">No orders found</h3>
            <p className="text-sm text-gray-400 mt-1">New incoming orders will appear here automatically.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <Card key={order.id} onClick={() => fetchOrderDetails(order.id)} className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 flex gap-4 items-center cursor-pointer">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                order.status === 'CONFIRMED' ? 'bg-cyan-500/20 text-cyan-400' : 
                order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                order.status === 'SHIPPED' ? 'bg-purple-500/20 text-purple-400' :
                order.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500/20 text-blue-400' :
                order.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-cyan-400 truncate">{order.orderName || `#${order.id.substring(0, 4)}`}</h3>
                  <span className="font-bold text-cyan-400 text-sm">Rs {order.amount}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{order.customer}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                    order.status === 'CONFIRMED' ? 'bg-cyan-500/10 text-cyan-400' : 
                    order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                    order.status === 'SHIPPED' ? 'bg-purple-500/10 text-purple-400' :
                    order.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500/10 text-blue-400' :
                    order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </Card>
          ))
        )}
      </div>

      {/* Mobile Order Details Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center p-0 sm:p-4">
          <div className="w-full h-[85vh] sm:h-auto sm:max-h-[90vh] bg-gray-900 border-t sm:border border-border/50 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Order Details</h3>
                  <p className="text-xs text-cyan-400 mt-1 font-semibold">
                    Order Number: {selectedOrderDetails?.orderName || (selectedOrderId ? `#${selectedOrderId.substring(0, 4)}` : "")}
                  </p>
                </div>
                <button onClick={closeDetailsModal} className="text-gray-400 hover:text-white transition-colors bg-black/20 p-2 rounded-full">
                  <PackageX className="w-5 h-5" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                  <p className="text-sm text-gray-400 mt-4">Loading...</p>
                </div>
              ) : selectedOrderDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Customer</p>
                      <p className="text-sm font-medium text-white">{selectedOrderDetails.customer}</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Phone</p>
                      <p className="text-sm font-medium text-white">{selectedOrderDetails.phone}</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Product</p>
                    <p className="text-sm font-medium text-white">{selectedOrderDetails.product}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Amount</p>
                      <p className="text-sm font-bold text-cyan-400">Rs {selectedOrderDetails.amount}</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20 flex flex-col justify-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Status</p>
                      <select
                        value={selectedOrderDetails.status}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedOrderDetails((prev: any) => ({ ...prev, status: val }));
                        }}
                        className="bg-transparent text-sm font-medium text-white border-none outline-none focus:ring-0 p-0 cursor-pointer"
                      >
                        <option value="PENDING" className="bg-gray-900 text-white">PENDING</option>
                        <option value="CONFIRMED" className="bg-gray-900 text-white">CONFIRMED</option>
                        <option value="CANCELLED" className="bg-gray-900 text-white">CANCELLED</option>
                        <option value="SHIPPED" className="bg-gray-900 text-white">SHIPPED</option>
                        <option value="OUT_FOR_DELIVERY" className="bg-gray-900 text-white">OUT FOR DELIVERY</option>
                        <option value="DELIVERED" className="bg-gray-900 text-white">DELIVERED</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Courier Name</label>
                      <input 
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. Leopard"
                        className="bg-transparent text-sm font-medium text-white border-none w-full outline-none focus:ring-0 p-0"
                      />
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Tracking Number</label>
                      <input 
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. TRK12345"
                        className="bg-transparent text-sm font-medium text-white border-none w-full outline-none focus:ring-0 p-0"
                      />
                    </div>
                  </div>

                  <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Shopify Order ID</p>
                    <p className="text-sm font-medium text-gray-300 break-all">{selectedOrderDetails.shopifyOrderId || "N/A"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Created At</p>
                      <p className="text-xs font-medium text-gray-300">{new Date(selectedOrderDetails.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Updated At</p>
                      <p className="text-xs font-medium text-gray-300">{new Date(selectedOrderDetails.updatedAt || selectedOrderDetails.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-red-400">Failed to load order details</div>
              )}
              
              <div className="mt-8 flex flex-col gap-2">
                {selectedOrderDetails && (
                  <>
                    <button 
                      onClick={saveOrderDetails}
                      disabled={isSavingDetails}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 text-black rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {isSavingDetails ? "Saving..." : "Save Changes"}
                    </button>
                    <button 
                      onClick={() => {
                        closeDetailsModal();
                        router.push(`/customers/${selectedOrderDetails.phone}`);
                      }}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" /> View Customer
                    </button>
                  </>
                )}
                <button 
                  onClick={closeDetailsModal}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
