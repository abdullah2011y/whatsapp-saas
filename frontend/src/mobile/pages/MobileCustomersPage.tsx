"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { Card } from "@/shared/components/ui/card"
import { Search, User, Loader2, PackageX } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MobileCustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch("/dashboard/customers")
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchCustomers()
    const interval = setInterval(fetchCustomers, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col p-4 space-y-4 pb-24 h-full relative">
      <header className="flex items-center justify-between pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Customers</h1>
        <div className="flex gap-3 text-cyan-400">
          <Search className="w-5 h-5" />
        </div>
      </header>

      <div className="space-y-3">
        {loading && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-gray-400 text-sm mt-4">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <PackageX className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white">No customers yet</h3>
            <p className="text-sm text-gray-400 mt-1">Customers will appear when orders are received.</p>
          </div>
        ) : (
          customers.map(customer => {
            const initials = customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <Card 
                key={customer.id} 
                onClick={() => router.push(`/customers/${customer.phone}`)}
                className="bg-gray-900/50 backdrop-blur-md border-gray-800 shadow-sm p-4 flex gap-4 items-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{customer.name}</h3>
                  <p className="text-xs text-gray-400 truncate">{customer.phone}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-medium text-cyan-400">{customer.ordersCount} Orders</span>
                    <span className="text-[10px] font-bold text-gray-300">Rs {customer.totalSpent.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Mobile Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full h-[85vh] bg-gray-900 border-t border-border/50 shadow-2xl rounded-t-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedCustomer.name}</h3>
                    <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-white transition-colors bg-black/20 p-2 rounded-full">
                  <PackageX className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total Orders</p>
                  <p className="text-lg font-bold text-white">{selectedCustomer.ordersCount}</p>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-border/20">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total Spent</p>
                  <p className="text-lg font-bold text-cyan-400">Rs {selectedCustomer.totalSpent.toLocaleString()}</p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-300 mb-3">Order History</h4>
              <div className="space-y-3">
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  selectedCustomer.orders.map((order: any) => (
                    <div key={order.id} className="bg-black/40 p-3 rounded-lg border border-border/20">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-gray-200 truncate">{order.product}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                          order.status === 'CONFIRMED' ? 'bg-cyan-500/10 text-cyan-400' : 
                          order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
                        <span className="text-xs font-bold text-gray-300">Rs {order.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No orders found</p>
                )}
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
