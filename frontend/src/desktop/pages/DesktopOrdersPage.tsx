"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  XCircle,
  MessageCircle,
  MessageSquareX,
  Loader2,
  PackageX,
  Download,
  User
} from "lucide-react"

import { useRouter } from "next/navigation"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/shared/components/ui/dropdown-menu"
import { Card } from "@/shared/components/ui/card"

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("")
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
      const url = query 
        ? `http://localhost:5000/orders?search=${encodeURIComponent(query)}`
        : "http://localhost:5000/orders"
      const res = await fetch(url)
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
      const res = await fetch(`http://localhost:5000/orders/${id}`)
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

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
      
      const res = await fetch(`http://localhost:5000/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) {
        fetchOrders()
      } else {
        if (selectedOrderId === id) {
          setSelectedOrderDetails((prev: any) => ({ ...prev, status: newStatus }))
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err)
      fetchOrders()
    }
  }

  const saveOrderDetails = async () => {
    if (!selectedOrderDetails) return
    setIsSavingDetails(true)
    try {
      const res = await fetch(`http://localhost:5000/orders/${selectedOrderDetails.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  const exportCSV = () => {
    if (orders.length === 0) return
    const headers = ["Order Number", "Customer", "Phone", "Product", "Amount", "Status", "Date"]
    const csvContent = [
      headers.join(","),
      ...orders.map(o => 
        `"${o.orderName || '#' + o.id.substring(0, 4)}","${o.customer}","${o.phone}","${o.product}","${o.amount}","${o.status}","${new Date(o.createdAt).toLocaleString()}"`
      )
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `orders_export_${new Date().getTime()}.csv`
    link.click()
  }

  const filteredOrders = orders

  return (
    <div className="flex-1 space-y-6 relative">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportCSV} disabled={orders.length === 0} className="border-border/50 bg-background/50 backdrop-blur-sm gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="bg-background/50 backdrop-blur-sm border-border/50 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order ID, customer, phone, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-accent/30 border-border/40 focus-visible:ring-primary/50"
            />
          </div>
          <Button variant="outline" className="gap-2 border-border/40 hover:bg-accent/50">
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        <div className="rounded-md border border-border/40 bg-accent/10 min-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[100px]">Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-500" />
                    <p className="text-sm text-muted-foreground mt-2">Loading orders...</p>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                        <PackageX className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground">No orders found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? "Try adjusting your search filters." : "New orders will automatically appear here."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-border/40 hover:bg-accent/30 transition-colors">
                    <TableCell className="font-medium text-cyan-400">
                      <span>{order.orderName || `#${order.id.substring(0, 4)}`}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer}</span>
                        <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>{order.product}</TableCell>
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
                      {order.status === "SHIPPED" && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 gap-1.5">
                          <Clock className="h-3 w-3" /> Shipped
                        </Badge>
                      )}
                      {order.status === "OUT_FOR_DELIVERY" && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1.5">
                          <Clock className="h-3 w-3" /> Out for Delivery
                        </Badge>
                      )}
                      {order.status === "DELIVERED" && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Delivered
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{order.phone}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">Rs {order.amount}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glassmorphism border-border/40">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => fetchOrderDetails(order.id)}>View details</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/40" />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="glassmorphism border-border/40">
                              <DropdownMenuItem onClick={() => updateStatus(order.id, "PENDING")}>Pending</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order.id, "CONFIRMED")}>Confirmed</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order.id, "CANCELLED")}>Cancelled</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order.id, "SHIPPED")}>Shipped</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order.id, "OUT_FOR_DELIVERY")}>Out for Delivery</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order.id, "DELIVERED")}>Delivered</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div>Showing {filteredOrders.length} orders</div>
        </div>
      </Card>

      {/* Order Details Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-gray-900 border-border/50 shadow-2xl overflow-hidden glassmorphism relative">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Order Details</h3>
                  <p className="text-sm text-cyan-400 mt-1 font-semibold">
                    Order Number: {selectedOrderDetails?.orderName || (selectedOrderId ? `#${selectedOrderId.substring(0, 4)}` : "")}
                  </p>
                </div>
                <button onClick={closeDetailsModal} className="text-gray-400 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                  <p className="text-sm text-gray-400 mt-4">Loading full details...</p>
                </div>
              ) : selectedOrderDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                      <p className="text-sm font-medium text-white">{selectedOrderDetails.customer}</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                      <p className="text-sm font-medium text-white">{selectedOrderDetails.phone}</p>
                    </div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                    <p className="text-xs text-gray-500 mb-1">Product</p>
                    <p className="text-sm font-medium text-white">{selectedOrderDetails.product}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <p className="text-xs text-gray-500 mb-1">Amount</p>
                      <p className="text-sm font-medium text-cyan-400">Rs {selectedOrderDetails.amount}</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30 flex flex-col justify-center">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <label className="text-xs text-gray-500 mb-1 block">Courier Name</label>
                      <input 
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. Leopard"
                        className="bg-transparent text-sm font-medium text-white border-none w-full outline-none focus:ring-0 p-0"
                      />
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <label className="text-xs text-gray-500 mb-1 block">Tracking Number</label>
                      <input 
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. TRK12345"
                        className="bg-transparent text-sm font-medium text-white border-none w-full outline-none focus:ring-0 p-0"
                      />
                    </div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                    <p className="text-xs text-gray-500 mb-1">Shopify Order ID</p>
                    <p className="text-sm font-medium text-white">{selectedOrderDetails.shopifyOrderId || "N/A"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <p className="text-xs text-gray-500 mb-1">Created At</p>
                      <p className="text-sm font-medium text-white">{new Date(selectedOrderDetails.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg border border-border/30">
                      <p className="text-xs text-gray-500 mb-1">Updated At</p>
                      <p className="text-sm font-medium text-white">{new Date(selectedOrderDetails.updatedAt || selectedOrderDetails.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-red-400">Failed to load order details</div>
              )}
            </div>
            <div className="bg-black/40 p-4 border-t border-border/50 flex justify-end gap-2">
              {selectedOrderDetails && (
                <>
                  <Button 
                    onClick={saveOrderDetails} 
                    disabled={isSavingDetails}
                    className="bg-green-500 hover:bg-green-600 text-black font-semibold gap-1.5"
                  >
                    {isSavingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </Button>
                  <Button 
                    onClick={() => {
                      closeDetailsModal();
                      router.push(`/customers/${selectedOrderDetails.phone}`);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold gap-1.5"
                  >
                    <User className="w-4 h-4" /> View Customer
                  </Button>
                </>
              )}
              <Button onClick={closeDetailsModal} variant="outline" className="border-border/40 hover:bg-accent/50">Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
