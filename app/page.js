'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, Package, Star, Plus, Minus, Truck, MapPin, CreditCard, CheckCircle, Clock, X } from 'lucide-react'

export default function App() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('store')
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1) // 1: info, 2: delivery, 3: otp, 4: payment
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' })
  const [deliveryOption, setDeliveryOption] = useState('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryZone, setDeliveryZone] = useState('')
  const [otp, setOtp] = useState('')
  const [currentOrder, setCurrentOrder] = useState(null)
  const [mockOtp, setMockOtp] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [amountPaid, setAmountPaid] = useState('')
  
  // Admin state
  const [orders, setOrders] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  
  // Product management
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', stock: '', image: '',
    isInfiniteStock: false, allowPickup: true, allowDelivery: true,
    deliveryFee: '', freeDeliveryZones: ''
  })

  // Order tracking
  const [trackingPhone, setTrackingPhone] = useState('')
  const [customerOrders, setCustomerOrders] = useState([])
  
  // Reviews
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewOrder, setReviewOrder] = useState(null)
  const [reviewForm, setReviewForm] = useState({ productId: '', rating: 5, comment: '' })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' })
    }
  }

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (orderFilter !== 'all') params.append('status', orderFilter.toUpperCase())
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' })
    }
  }

  const fetchDashboardStats = async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      
      const res = await fetch(`/api/admin/dashboard?${params}`)
      const data = await res.json()
      setDashboardStats(data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load dashboard', variant: 'destructive' })
    }
  }

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    
    if (existingItem) {
      if (!product.isInfiniteStock && existingItem.quantity >= product.stock) {
        toast({ title: 'Out of stock', description: `Only ${product.stock} available`, variant: 'destructive' })
        return
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    
    toast({ title: 'Added to cart', description: `${product.name} added` })
  }

  const updateCartQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta
        if (newQuantity <= 0) return null
        if (!item.isInfiniteStock && newQuantity > item.stock) return item
        return { ...item, quantity: newQuantity }
      }
      return item
    }).filter(Boolean))
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  const startCheckout = () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', description: 'Add products to cart first', variant: 'destructive' })
      return
    }
    setShowCheckout(true)
    setCheckoutStep(1)
  }

  const submitCustomerInfo = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
          customerName: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email
        })
      })

      const order = await res.json()
      
      if (!res.ok) {
        toast({ title: 'Error', description: order.error, variant: 'destructive' })
        return
      }

      setCurrentOrder(order)
      setCheckoutStep(2)
      toast({ title: 'Order created', description: `Order ID: ${order.id}` })
      
      // Clear cart after order creation
      setCart([])
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create order', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const submitDeliveryOption = async () => {
    if (deliveryOption === 'delivery' && (!deliveryAddress || !deliveryZone)) {
      toast({ title: 'Error', description: 'Please provide delivery address and zone', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryOption,
          deliveryAddress,
          deliveryZone
        })
      })

      const result = await res.json()
      
      if (!res.ok) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }

      setCurrentOrder({ ...currentOrder, deliveryFee: result.deliveryFee, totalAmount: result.totalAmount })
      
      // Send OTP
      const otpRes = await fetch(`/api/orders/${currentOrder.id}/verify-phone`, {
        method: 'POST'
      })
      const otpData = await otpRes.json()
      
      if (otpData.success) {
        setMockOtp(otpData.mockOtp)
        setCheckoutStep(3)
        toast({ title: 'OTP Sent', description: `[MOCKED] OTP: ${otpData.mockOtp}` })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process delivery option', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: 'Error', description: 'Please enter 6-digit OTP', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/confirm-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      })

      const result = await res.json()
      
      if (!res.ok) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }

      setCheckoutStep(4)
      toast({ title: 'Success', description: 'Phone verified successfully' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to verify OTP', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const initiatePayment = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      })

      const result = await res.json()
      
      if (!res.ok) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }

      toast({ 
        title: '[MOCKED] Payment Link Generated', 
        description: 'In production, user would be redirected to Flutterwave' 
      })
      
      // Auto-set amount for testing
      setAmountPaid(currentOrder.totalAmount.toString())
      
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to initiate payment', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const confirmPayment = async () => {
    if (!amountPaid) {
      toast({ title: 'Error', description: 'Please enter payment amount', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: `MOCK_${currentOrder.id}`,
          amountPaid: parseFloat(amountPaid)
        })
      })

      const result = await res.json()
      
      if (!res.ok) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }

      toast({ 
        title: 'Order Confirmed! 🎉', 
        description: '[MOCKED] Receipt sent to your email' 
      })
      
      // Reset checkout
      setShowCheckout(false)
      setCheckoutStep(1)
      setCustomerInfo({ name: '', phone: '', email: '' })
      setOtp('')
      setMockOtp('')
      setAmountPaid('')
      setCurrentOrder(null)
      setDeliveryAddress('')
      setDeliveryZone('')
      
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to confirm payment', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const trackOrders = async () => {
    if (!trackingPhone) {
      toast({ title: 'Error', description: 'Please enter phone number', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(trackingPhone)}/orders`)
      const data = await res.json()
      setCustomerOrders(data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch orders', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Order status updated' })
        fetchOrders()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    if (!reviewForm.productId || !reviewForm.rating) {
      toast({ title: 'Error', description: 'Please select product and rating', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: reviewOrder.id,
          productId: reviewForm.productId,
          customerName: reviewOrder.customerName,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      })

      const result = await res.json()
      
      if (!res.ok) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Review submitted' })
      setShowReviewForm(false)
      setReviewForm({ productId: '', rating: 5, comment: '' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit review', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const saveProduct = async () => {
    setLoading(true)
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          freeDeliveryZones: productForm.freeDeliveryZones.split(',').map(z => z.trim()).filter(Boolean)
        })
      })

      if (res.ok) {
        toast({ title: 'Success', description: editingProduct ? 'Product updated' : 'Product created' })
        setShowProductForm(false)
        setEditingProduct(null)
        setProductForm({
          name: '', description: '', price: '', stock: '', image: '',
          isInfiniteStock: false, allowPickup: true, allowDelivery: true,
          deliveryFee: '', freeDeliveryZones: ''
        })
        fetchProducts()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save product', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Success', description: 'Product deleted' })
        fetchProducts()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const seedDatabase = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const result = await res.json()
      toast({ title: 'Success', description: result.message })
      fetchProducts()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to seed database', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-500',
      CONFIRMED: 'bg-blue-500',
      PACKAGED: 'bg-purple-500',
      READY: 'bg-orange-500',
      DELIVERED: 'bg-green-500',
      CANCELLED: 'bg-red-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchOrders()
      fetchDashboardStats()
    }
  }, [activeTab, orderFilter, dateRange])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Dehadza Store</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={seedDatabase}>Seed Products</Button>
            <Button variant="outline" className="relative" onClick={() => setActiveTab('cart')}>
              <ShoppingCart className="h-5 w-5" />
              {getCartCount() > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0">
                  {getCartCount()}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-8">
            <TabsTrigger value="store">Store</TabsTrigger>
            <TabsTrigger value="cart">Cart ({getCartCount()})</TabsTrigger>
            <TabsTrigger value="track">Track Order</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* STORE TAB */}
          <TabsContent value="store">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Shop Our Products</h2>
              <p className="text-slate-600">Browse our collection and add items to your cart</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                    <div className="h-48 bg-slate-200 rounded-t-lg overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="h-16 w-16" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                    <CardDescription className="text-sm mb-3">{product.description}</CardDescription>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-blue-600">${product.price}</span>
                      {product.isInfiniteStock ? (
                        <Badge variant="secondary">In Stock</Badge>
                      ) : (
                        <Badge variant={product.stock > 0 ? 'secondary' : 'destructive'}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of stock'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs text-slate-600">
                      {product.allowPickup && <Badge variant="outline">Pickup</Badge>}
                      {product.allowDelivery && <Badge variant="outline">Delivery ${product.deliveryFee}</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button 
                      className="w-full" 
                      onClick={() => addToCart(product)}
                      disabled={!product.isInfiniteStock && product.stock === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-20">
                <Package className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg">No products available</p>
                <Button onClick={seedDatabase} className="mt-4">Seed Sample Products</Button>
              </div>
            )}
          </TabsContent>

          {/* CART TAB */}
          <TabsContent value="cart">
            <Card>
              <CardHeader>
                <CardTitle>Shopping Cart</CardTitle>
                <CardDescription>Review your items before checkout</CardDescription>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="h-20 w-20 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-slate-600">${item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateCartQuantity(item.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-semibold">{item.quantity}</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateCartQuantity(item.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600">${getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={startCheckout}
                  disabled={cart.length === 0}
                >
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* TRACK ORDER TAB */}
          <TabsContent value="track">
            <Card>
              <CardHeader>
                <CardTitle>Track Your Orders</CardTitle>
                <CardDescription>Enter your phone number to view order status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input 
                    placeholder="Enter phone number"
                    value={trackingPhone}
                    onChange={(e) => setTrackingPhone(e.target.value)}
                  />
                  <Button onClick={trackOrders} disabled={loading}>
                    Track
                  </Button>
                </div>

                {customerOrders.length > 0 && (
                  <div className="space-y-4">
                    {customerOrders.map(order => (
                      <Card key={order.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">Order #{order.id.slice(0, 8)}</CardTitle>
                              <CardDescription>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.productName} x {item.quantity}</span>
                                <span>${item.total}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>${order.totalAmount}</span>
                              </div>
                            </div>
                            {order.deliveryOption && (
                              <p className="text-sm text-slate-600">
                                {order.deliveryOption === 'pickup' ? '📦 Pickup' : `🚚 Delivery to ${order.deliveryAddress}`}
                              </p>
                            )}
                          </div>
                          {order.status === 'DELIVERED' && (
                            <Button 
                              className="w-full mt-4" 
                              variant="outline"
                              onClick={() => {
                                setReviewOrder(order)
                                setShowReviewForm(true)
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Leave a Review
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMIN TAB */}
          <TabsContent value="admin">
            <div className="space-y-6">
              {/* Dashboard Stats */}
              {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Revenue</CardDescription>
                      <CardTitle className="text-3xl text-green-600">
                        ${dashboardStats.totalRevenue?.toFixed(2) || 0}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Orders</CardDescription>
                      <CardTitle className="text-3xl">{dashboardStats.totalOrders || 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Pending Orders</CardDescription>
                      <CardTitle className="text-3xl text-yellow-600">{dashboardStats.pendingOrders || 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Delivered</CardDescription>
                      <CardTitle className="text-3xl text-blue-600">{dashboardStats.deliveredOrders || 0}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={orderFilter} onValueChange={setOrderFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Orders</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="packaged">Packaged</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Management */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Products</CardTitle>
                    <Button onClick={() => setShowProductForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-slate-600">${product.price} | Stock: {product.isInfiniteStock ? '∞' : product.stock}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingProduct(product)
                              setProductForm({
                                name: product.name,
                                description: product.description,
                                price: product.price.toString(),
                                stock: product.stock.toString(),
                                image: product.image,
                                isInfiniteStock: product.isInfiniteStock,
                                allowPickup: product.allowPickup,
                                allowDelivery: product.allowDelivery,
                                deliveryFee: product.deliveryFee.toString(),
                                freeDeliveryZones: product.freeDeliveryZones?.join(', ') || ''
                              })
                              setShowProductForm(true)
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteProduct(product.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Orders Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.map(order => (
                      <Card key={order.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">#{order.id.slice(0, 8)}</CardTitle>
                              <CardDescription>
                                {order.customerName} | {order.phone}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 mb-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.productName} x {item.quantity}</span>
                                <span>${item.total}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2">
                              <div className="flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>${order.totalAmount}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {order.status === 'CONFIRMED' && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'PACKAGED')}>
                                Mark as Packaged
                              </Button>
                            )}
                            {order.status === 'PACKAGED' && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'READY')}>
                                Mark as Ready
                              </Button>
                            )}
                            {order.status === 'READY' && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'DELIVERED')}>
                                Mark as Delivered
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {orders.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        No orders found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Best Sellers */}
              {dashboardStats?.bestSellers?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Best Selling Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboardStats.bestSellers.map((product, idx) => (
                        <div key={product.productId} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <Badge>{idx + 1}</Badge>
                            <div>
                              <p className="font-semibold">{product.productName}</p>
                              <p className="text-sm text-slate-600">{product.totalQuantity} units sold</p>
                            </div>
                          </div>
                          <p className="font-bold text-green-600">${product.totalRevenue.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* CHECKOUT DIALOG */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout - Step {checkoutStep} of 4</DialogTitle>
            <DialogDescription>
              {checkoutStep === 1 && 'Enter your contact information'}
              {checkoutStep === 2 && 'Choose delivery option'}
              {checkoutStep === 3 && 'Verify your phone number'}
              {checkoutStep === 4 && 'Complete payment'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Customer Info */}
          {checkoutStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input 
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input 
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <Button className="w-full" onClick={submitCustomerInfo} disabled={loading}>
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Delivery Option */}
          {checkoutStep === 2 && currentOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  ⏰ Complete payment within 20 minutes or order will be cancelled
                </p>
              </div>
              
              <div>
                <Label>Delivery Option</Label>
                <Select value={deliveryOption} onValueChange={setDeliveryOption}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup from Store</SelectItem>
                    <SelectItem value="delivery">Home Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {deliveryOption === 'delivery' && (
                <>
                  <div>
                    <Label>Delivery Address</Label>
                    <Textarea 
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter full delivery address"
                    />
                  </div>
                  <div>
                    <Label>Delivery Zone</Label>
                    <Input 
                      value={deliveryZone}
                      onChange={(e) => setDeliveryZone(e.target.value)}
                      placeholder="e.g., downtown, suburb"
                    />
                  </div>
                </>
              )}

              <Button className="w-full" onClick={submitDeliveryOption} disabled={loading}>
                Continue to Verification
              </Button>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {checkoutStep === 3 && currentOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">[MOCKED] OTP Sent</p>
                  <p className="text-xs text-blue-700">Mock OTP: {mockOtp}</p>
                </div>
              </div>
              
              <div>
                <Label>Enter 6-digit OTP</Label>
                <Input 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <Button className="w-full" onClick={verifyOTP} disabled={loading}>
                Verify OTP
              </Button>
            </div>
          )}

          {/* Step 4: Payment */}
          {checkoutStep === 4 && currentOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-semibold text-green-900 mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${currentOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>${currentOrder.deliveryFee?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-green-600">${currentOrder.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={initiatePayment} disabled={loading}>
                <CreditCard className="h-4 w-4 mr-2" />
                Initiate Payment (MOCKED)
              </Button>

              <div className="border-t pt-4">
                <Label>Simulate Payment - Enter Amount Paid</Label>
                <Input 
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={currentOrder.totalAmount?.toFixed(2)}
                />
                <Button className="w-full mt-2" onClick={confirmPayment} disabled={loading || !amountPaid}>
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PRODUCT FORM DIALOG */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input 
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input 
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                />
              </div>
              <div>
                <Label>Stock</Label>
                <Input 
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                  disabled={productForm.isInfiniteStock}
                />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input 
                value={productForm.image}
                onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={productForm.isInfiniteStock}
                  onChange={(e) => setProductForm({...productForm, isInfiniteStock: e.target.checked})}
                />
                <span className="text-sm">Infinite Stock</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={productForm.allowPickup}
                  onChange={(e) => setProductForm({...productForm, allowPickup: e.target.checked})}
                />
                <span className="text-sm">Allow Pickup</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={productForm.allowDelivery}
                  onChange={(e) => setProductForm({...productForm, allowDelivery: e.target.checked})}
                />
                <span className="text-sm">Allow Delivery</span>
              </label>
            </div>
            <div>
              <Label>Delivery Fee ($)</Label>
              <Input 
                type="number"
                value={productForm.deliveryFee}
                onChange={(e) => setProductForm({...productForm, deliveryFee: e.target.value})}
              />
            </div>
            <div>
              <Label>Free Delivery Zones (comma-separated)</Label>
              <Input 
                value={productForm.freeDeliveryZones}
                onChange={(e) => setProductForm({...productForm, freeDeliveryZones: e.target.value})}
                placeholder="downtown, suburb"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={loading}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVIEW FORM DIALOG */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          {reviewOrder && (
            <div className="space-y-4">
              <div>
                <Label>Select Product</Label>
                <Select value={reviewForm.productId} onValueChange={(value) => setReviewForm({...reviewForm, productId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewOrder.items.map(item => (
                      <SelectItem key={item.productId} value={item.productId}>
                        {item.productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rating</Label>
                <Select value={reviewForm.rating.toString()} onValueChange={(value) => setReviewForm({...reviewForm, rating: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ (5 stars)</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ (4 stars)</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ (3 stars)</SelectItem>
                    <SelectItem value="2">⭐⭐ (2 stars)</SelectItem>
                    <SelectItem value="1">⭐ (1 star)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comment (optional)</Label>
                <Textarea 
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  placeholder="Share your experience..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
            <Button onClick={submitReview} disabled={loading}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}