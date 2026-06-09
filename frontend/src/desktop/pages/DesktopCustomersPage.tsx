"use client"
import { apiFetch } from "@/shared/lib/api/client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Calendar, 
  ShoppingBag,
  X,
  Loader2,
  PackageX
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Badge } from "@/shared/components/ui/badge"
import { Card } from "@/shared/components/ui/card"

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
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

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full gap-6 relative overflow-hidden">
      {/* Main List */}
      <div className={`flex-1 space-y-6 transition-all duration-300 ${selectedCustomer ? 'pr-[400px]' : ''}`}>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        </div>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-sm relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-500" />
                      <p className="text-sm text-muted-foreground mt-2">Loading customers...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                          <PackageX className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No customers found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {searchQuery ? "Try adjusting your search." : "Customers will appear when orders are received."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const initials = customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <TableRow 
                        key={customer.id} 
                        className={`border-border/40 hover:bg-accent/30 transition-colors cursor-pointer ${selectedCustomer?.id === customer.id ? 'bg-primary/10' : ''}`}
                        onClick={() => router.push(`/customers/${customer.phone}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.ordersCount} orders</TableCell>
                        <TableCell className="text-right font-medium">Rs {customer.totalSpent.toLocaleString()}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div>Showing {filteredCustomers.length} customers</div>
          </div>
        </Card>
      </div>

      {/* Slide-over Detail Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-[380px] bg-background/80 backdrop-blur-xl border-l border-border/50 shadow-2xl p-6 overflow-y-auto custom-scrollbar z-20"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-semibold">Customer Details</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)} className="rounded-full hover:bg-accent/50">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-col items-center text-center mb-8">
              <Avatar className="h-20 w-20 mb-4 border-2 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
              <p className="text-muted-foreground">{selectedCustomer.phone}</p>
            </div>

            <div className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact Information</h4>
                <div className="bg-accent/20 rounded-lg p-3 space-y-3 border border-border/30">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent/20 rounded-lg p-3 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
                  <div className="font-semibold text-primary">Rs {selectedCustomer.totalSpent.toLocaleString()}</div>
                </div>
                <div className="bg-accent/20 rounded-lg p-3 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Total Orders</div>
                  <div className="font-semibold">{selectedCustomer.ordersCount}</div>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Orders</h4>
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  selectedCustomer.orders.slice(0, 5).map((order: any) => (
                    <div 
                      key={order.id}
                      className="bg-accent/20 rounded-lg p-3 border border-border/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm truncate max-w-[120px]" title={order.id}>{order.id.substring(0, 8)}...</span>
                        </div>
                        <Badge variant="outline" className={
                          order.status === 'CONFIRMED' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                          order.status === 'PENDING' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' :
                          'text-red-500 border-red-500/20 bg-red-500/10'
                        }>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                        <span className="font-medium text-foreground">Rs {order.amount.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{order.product}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders found</p>
                )}
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-4 border-t border-border/30">
                <Calendar className="h-3 w-3" />
                Last order: {new Date(selectedCustomer.lastOrderDate).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
