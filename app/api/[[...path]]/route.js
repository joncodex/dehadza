import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// MOCK INTEGRATIONS
const MockServices = {
  // Africa's Talking OTP Mock
  async sendOTP(phone, otp) {
    console.log(`[MOCKED] Sending OTP ${otp} to ${phone} via Africa's Talking`)
    return { success: true, messageId: `mock_${uuidv4()}` }
  },

  // Flutterwave Payment Mock
  async initiatePayment(orderId, amount, email, phone) {
    console.log(`[MOCKED] Initiating Flutterwave payment for order ${orderId}: $${amount}`)
    return { 
      success: true, 
      paymentLink: `https://mock-flutterwave.com/pay/${orderId}`,
      transactionId: `FLW_MOCK_${uuidv4()}`,
      reference: `REF_${orderId}_${Date.now()}`
    }
  },

  async verifyPayment(transactionId) {
    console.log(`[MOCKED] Verifying Flutterwave payment: ${transactionId}`)
    // Mock: all payments are successful
    return { 
      success: true, 
      status: 'successful',
      amount: 0, // Will be set based on order
      transactionId 
    }
  },

  // SendGrid Email Mock
  async sendEmail(to, subject, html) {
    console.log(`[MOCKED] Sending email via SendGrid to ${to}: ${subject}`)
    return { success: true, messageId: `sg_mock_${uuidv4()}` }
  }
}

// Background job to check expired orders and reservations
let expirationJobRunning = false

async function startExpirationJob() {
  if (expirationJobRunning) return
  expirationJobRunning = true

  setInterval(async () => {
    try {
      const db = await connectToMongo()
      const now = new Date()

      // Find expired orders
      const expiredOrders = await db.collection('orders')
        .find({ 
          status: 'PENDING', 
          expiresAt: { $lt: now } 
        })
        .toArray()

      for (const order of expiredOrders) {
        // Restore stock
        for (const item of order.items) {
          await db.collection('products').updateOne(
            { id: item.productId },
            { $inc: { stock: item.quantity } }
          )
        }

        // Cancel order
        await db.collection('orders').updateOne(
          { id: order.id },
          { $set: { status: 'CANCELLED', cancelledAt: now, cancelReason: 'Payment timeout' } }
        )

        console.log(`Order ${order.id} expired and cancelled`)
      }

      // Clean up expired stock reservations
      await db.collection('stockReservations').deleteMany({ expiresAt: { $lt: now } })

    } catch (error) {
      console.error('Expiration job error:', error)
    }
  }, 60000) // Run every minute
}

// Start the job when server starts
startExpirationJob()

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // ============ PRODUCTS API ============
    
    // GET /api/products - List all products (customer view)
    if (route === '/products' && method === 'GET') {
      const products = await db.collection('products')
        .find({ deleted: { $ne: true } })
        .toArray()
      
      const cleanProducts = products.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanProducts))
    }

    // GET /api/products/[id] - Get single product
    if (route.startsWith('/products/') && method === 'GET') {
      const productId = path[1]
      const product = await db.collection('products').findOne({ id: productId })
      
      if (!product) {
        return handleCORS(NextResponse.json({ error: 'Product not found' }, { status: 404 }))
      }
      
      const { _id, ...cleanProduct } = product
      return handleCORS(NextResponse.json(cleanProduct))
    }

    // POST /api/products - Create product (admin)
    if (route === '/products' && method === 'POST') {
      const body = await request.json()
      
      const product = {
        id: uuidv4(),
        name: body.name,
        description: body.description || '',
        price: parseFloat(body.price),
        image: body.image || '',
        stock: body.isInfiniteStock ? -1 : parseInt(body.stock || 0),
        isInfiniteStock: body.isInfiniteStock || false,
        allowPickup: body.allowPickup !== false,
        allowDelivery: body.allowDelivery !== false,
        deliveryFee: parseFloat(body.deliveryFee || 0),
        freeDeliveryZones: body.freeDeliveryZones || [],
        createdAt: new Date(),
        deleted: false
      }

      await db.collection('products').insertOne(product)
      const { _id, ...cleanProduct } = product
      return handleCORS(NextResponse.json(cleanProduct, { status: 201 }))
    }

    // PUT /api/products/[id] - Update product (admin)
    if (route.startsWith('/products/') && method === 'PUT') {
      const productId = path[1]
      const body = await request.json()
      
      const updateData = {
        ...body,
        updatedAt: new Date()
      }
      
      if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price)
      if (updateData.stock !== undefined && !updateData.isInfiniteStock) {
        updateData.stock = parseInt(updateData.stock)
      }
      if (updateData.isInfiniteStock) updateData.stock = -1
      if (updateData.deliveryFee !== undefined) updateData.deliveryFee = parseFloat(updateData.deliveryFee)
      
      delete updateData.id
      delete updateData._id
      
      await db.collection('products').updateOne(
        { id: productId },
        { $set: updateData }
      )
      
      return handleCORS(NextResponse.json({ success: true }))
    }

    // DELETE /api/products/[id] - Soft delete product (admin)
    if (route.startsWith('/products/') && method === 'DELETE') {
      const productId = path[1]
      
      await db.collection('products').updateOne(
        { id: productId },
        { $set: { deleted: true, deletedAt: new Date() } }
      )
      
      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ ORDERS API ============
    
    // POST /api/orders - Create new order
    if (route === '/orders' && method === 'POST') {
      const body = await request.json()
      const { items, customerName, phone, email } = body

      // Validate stock availability
      const productIds = items.map(item => item.productId)
      const products = await db.collection('products')
        .find({ id: { $in: productIds } })
        .toArray()

      const productMap = {}
      products.forEach(p => { productMap[p.id] = p })

      // Check stock for each item
      for (const item of items) {
        const product = productMap[item.productId]
        if (!product) {
          return handleCORS(NextResponse.json(
            { error: `Product ${item.productId} not found` },
            { status: 400 }
          ))
        }

        if (!product.isInfiniteStock && product.stock < item.quantity) {
          return handleCORS(NextResponse.json(
            { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
            { status: 400 }
          ))
        }
      }

      // Calculate total
      let subtotal = 0
      const orderItems = items.map(item => {
        const product = productMap[item.productId]
        const itemTotal = product.price * item.quantity
        subtotal += itemTotal
        return {
          productId: item.productId,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
          total: itemTotal
        }
      })

      // Reserve stock
      for (const item of items) {
        const product = productMap[item.productId]
        if (!product.isInfiniteStock) {
          await db.collection('products').updateOne(
            { id: item.productId },
            { $inc: { stock: -item.quantity } }
          )
        }
      }

      // Create order
      const orderId = uuidv4()
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes

      const order = {
        id: orderId,
        customerName,
        phone,
        email,
        items: orderItems,
        subtotal,
        deliveryFee: 0, // Will be set when delivery option chosen
        totalAmount: subtotal,
        status: 'PENDING',
        phoneVerified: false,
        paymentStatus: 'PENDING',
        createdAt: new Date(),
        expiresAt,
        deliveryOption: null, // 'pickup' or 'delivery'
        deliveryAddress: null
      }

      await db.collection('orders').insertOne(order)

      const { _id, ...cleanOrder } = order
      return handleCORS(NextResponse.json(cleanOrder, { status: 201 }))
    }

    // GET /api/orders - Get all orders (admin)
    if (route === '/orders' && method === 'GET') {
      const { status, startDate, endDate } = Object.fromEntries(new URL(request.url).searchParams)
      
      const query = {}
      if (status) query.status = status
      if (startDate || endDate) {
        query.createdAt = {}
        if (startDate) query.createdAt.$gte = new Date(startDate)
        if (endDate) query.createdAt.$lte = new Date(endDate)
      }

      const orders = await db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

      const cleanOrders = orders.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanOrders))
    }

    // GET /api/orders/[id] - Get single order
    if (route.startsWith('/orders/') && path.length === 2 && method === 'GET') {
      const orderId = path[1]
      const order = await db.collection('orders').findOne({ id: orderId })
      
      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }
      
      const { _id, ...cleanOrder } = order
      return handleCORS(NextResponse.json(cleanOrder))
    }

    // PUT /api/orders/[id]/delivery - Set delivery option
    if (route.match(/\/orders\/[^\/]+\/delivery$/) && method === 'PUT') {
      const orderId = path[1]
      const body = await request.json()
      const { deliveryOption, deliveryAddress, deliveryZone } = body

      const order = await db.collection('orders').findOne({ id: orderId })
      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      let deliveryFee = 0
      if (deliveryOption === 'delivery') {
        // Calculate delivery fee based on product settings
        const productIds = order.items.map(item => item.productId)
        const products = await db.collection('products')
          .find({ id: { $in: productIds } })
          .toArray()

        // Use the highest delivery fee from ordered products
        for (const product of products) {
          const isFreeZone = product.freeDeliveryZones?.includes(deliveryZone)
          if (!isFreeZone && product.deliveryFee > deliveryFee) {
            deliveryFee = product.deliveryFee
          }
        }
      }

      const totalAmount = order.subtotal + deliveryFee

      await db.collection('orders').updateOne(
        { id: orderId },
        { 
          $set: { 
            deliveryOption, 
            deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : null,
            deliveryZone: deliveryOption === 'delivery' ? deliveryZone : null,
            deliveryFee,
            totalAmount,
            updatedAt: new Date()
          } 
        }
      )

      return handleCORS(NextResponse.json({ success: true, deliveryFee, totalAmount }))
    }

    // POST /api/orders/[id]/verify-phone - Send OTP
    if (route.match(/\/orders\/[^\/]+\/verify-phone$/) && method === 'POST') {
      const orderId = path[1]
      
      const order = await db.collection('orders').findOne({ id: orderId })
      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store OTP
      await db.collection('otpVerifications').insertOne({
        id: uuidv4(),
        orderId,
        phone: order.phone,
        otp,
        verified: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        createdAt: new Date()
      })

      // Send OTP via Africa's Talking (MOCKED)
      await MockServices.sendOTP(order.phone, otp)

      return handleCORS(NextResponse.json({ 
        success: true, 
        message: '[MOCKED] OTP sent successfully',
        mockOtp: otp // Only for testing, remove in production
      }))
    }

    // POST /api/orders/[id]/confirm-otp - Verify OTP
    if (route.match(/\/orders\/[^\/]+\/confirm-otp$/) && method === 'POST') {
      const orderId = path[1]
      const body = await request.json()
      const { otp } = body

      const verification = await db.collection('otpVerifications').findOne({
        orderId,
        otp,
        verified: false,
        expiresAt: { $gt: new Date() }
      })

      if (!verification) {
        return handleCORS(NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 }))
      }

      // Mark as verified
      await db.collection('otpVerifications').updateOne(
        { id: verification.id },
        { $set: { verified: true, verifiedAt: new Date() } }
      )

      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { phoneVerified: true } }
      )

      return handleCORS(NextResponse.json({ success: true, message: 'Phone verified successfully' }))
    }

    // POST /api/orders/[id]/payment - Initiate payment
    if (route.match(/\/orders\/[^\/]+\/payment$/) && method === 'POST') {
      const orderId = path[1]
      const body = await request.json()
      const { paymentMethod } = body // 'card' or 'transfer'

      const order = await db.collection('orders').findOne({ id: orderId })
      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      if (!order.phoneVerified) {
        return handleCORS(NextResponse.json({ error: 'Phone not verified' }, { status: 400 }))
      }

      // Initiate payment with Flutterwave (MOCKED)
      const paymentResult = await MockServices.initiatePayment(
        orderId,
        order.totalAmount,
        order.email,
        order.phone
      )

      // Store payment record
      const payment = {
        id: uuidv4(),
        orderId,
        amount: order.totalAmount,
        method: paymentMethod,
        status: 'PENDING',
        transactionId: paymentResult.transactionId,
        reference: paymentResult.reference,
        createdAt: new Date()
      }

      await db.collection('payments').insertOne(payment)

      return handleCORS(NextResponse.json({
        success: true,
        paymentLink: paymentResult.paymentLink,
        transactionId: paymentResult.transactionId,
        reference: paymentResult.reference,
        message: '[MOCKED] Payment initiated'
      }))
    }

    // POST /api/orders/[id]/confirm-payment - Confirm payment (webhook simulation)
    if (route.match(/\/orders\/[^\/]+\/confirm-payment$/) && method === 'POST') {
      const orderId = path[1]
      const body = await request.json()
      const { transactionId, amountPaid } = body

      const order = await db.collection('orders').findOne({ id: orderId })
      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      // Verify payment with Flutterwave (MOCKED)
      const verification = await MockServices.verifyPayment(transactionId)

      if (!verification.success) {
        return handleCORS(NextResponse.json({ error: 'Payment verification failed' }, { status: 400 }))
      }

      // Check if amount is sufficient
      if (amountPaid < order.totalAmount) {
        return handleCORS(NextResponse.json({ 
          error: 'Insufficient payment amount',
          required: order.totalAmount,
          received: amountPaid
        }, { status: 400 }))
      }

      // Update payment status
      await db.collection('payments').updateOne(
        { transactionId },
        { 
          $set: { 
            status: 'COMPLETED',
            amountPaid,
            completedAt: new Date()
          } 
        }
      )

      // Update order status
      await db.collection('orders').updateOne(
        { id: orderId },
        { 
          $set: { 
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            confirmedAt: new Date()
          } 
        }
      )

      // Generate receipt and send email (MOCKED)
      const receiptHtml = `
        <h1>Order Receipt - Dehadza Store</h1>
        <p>Order ID: ${orderId}</p>
        <p>Customer: ${order.customerName}</p>
        <h3>Items:</h3>
        <ul>
          ${order.items.map(item => `<li>${item.productName} x ${item.quantity} = $${item.total}</li>`).join('')}
        </ul>
        <p>Subtotal: $${order.subtotal}</p>
        <p>Delivery Fee: $${order.deliveryFee}</p>
        <p><strong>Total: $${order.totalAmount}</strong></p>
        <p>Payment Status: PAID</p>
        <p>Delivery: ${order.deliveryOption === 'pickup' ? 'Pickup' : 'Delivery to ' + order.deliveryAddress}</p>
      `

      await MockServices.sendEmail(order.email, `Order Confirmation - ${orderId}`, receiptHtml)

      // Notify admin (MOCKED)
      await MockServices.sendEmail('admin@dehadza.com', `New Order ${orderId}`, receiptHtml)

      return handleCORS(NextResponse.json({ 
        success: true, 
        message: '[MOCKED] Payment confirmed, receipt sent',
        orderId 
      }))
    }

    // PUT /api/orders/[id]/status - Update order status (admin)
    if (route.match(/\/orders\/[^\/]+\/status$/) && method === 'PUT') {
      const orderId = path[1]
      const body = await request.json()
      const { status } = body

      const validStatuses = ['PENDING', 'CONFIRMED', 'PACKAGED', 'READY', 'DELIVERED', 'CANCELLED']
      if (!validStatuses.includes(status)) {
        return handleCORS(NextResponse.json({ error: 'Invalid status' }, { status: 400 }))
      }

      await db.collection('orders').updateOne(
        { id: orderId },
        { 
          $set: { 
            status,
            [`${status.toLowerCase()}At`]: new Date(),
            updatedAt: new Date()
          } 
        }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ REVIEWS API ============
    
    // POST /api/reviews - Create review (only after delivery)
    if (route === '/reviews' && method === 'POST') {
      const body = await request.json()
      const { orderId, productId, rating, comment, customerName } = body

      const order = await db.collection('orders').findOne({ id: orderId })
      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      if (order.status !== 'DELIVERED') {
        return handleCORS(NextResponse.json({ 
          error: 'Reviews can only be submitted after delivery' 
        }, { status: 400 }))
      }

      // Check if product was in this order
      const orderedProduct = order.items.find(item => item.productId === productId)
      if (!orderedProduct) {
        return handleCORS(NextResponse.json({ 
          error: 'Product not found in this order' 
        }, { status: 400 }))
      }

      const review = {
        id: uuidv4(),
        orderId,
        productId,
        customerName,
        rating: parseInt(rating),
        comment: comment || '',
        createdAt: new Date()
      }

      await db.collection('reviews').insertOne(review)

      const { _id, ...cleanReview } = review
      return handleCORS(NextResponse.json(cleanReview, { status: 201 }))
    }

    // GET /api/reviews - Get reviews for a product
    if (route === '/reviews' && method === 'GET') {
      const { productId } = Object.fromEntries(new URL(request.url).searchParams)
      
      const query = productId ? { productId } : {}
      const reviews = await db.collection('reviews')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

      const cleanReviews = reviews.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanReviews))
    }

    // ============ ADMIN DASHBOARD API ============
    
    // GET /api/admin/dashboard - Get dashboard stats
    if (route === '/admin/dashboard' && method === 'GET') {
      const { startDate, endDate } = Object.fromEntries(new URL(request.url).searchParams)
      
      const dateQuery = {}
      if (startDate || endDate) {
        dateQuery.createdAt = {}
        if (startDate) dateQuery.createdAt.$gte = new Date(startDate)
        if (endDate) dateQuery.createdAt.$lte = new Date(endDate)
      }

      // Total revenue (confirmed orders only)
      const revenueQuery = { ...dateQuery, status: { $in: ['CONFIRMED', 'PACKAGED', 'READY', 'DELIVERED'] } }
      const orders = await db.collection('orders').find(revenueQuery).toArray()
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)

      // Order statistics
      const totalOrders = orders.length
      const pendingOrders = await db.collection('orders').countDocuments({ status: 'PENDING' })
      const deliveredOrders = await db.collection('orders').countDocuments({ status: 'DELIVERED', ...dateQuery })

      // Best selling products
      const productSales = {}
      orders.forEach(order => {
        order.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              totalQuantity: 0,
              totalRevenue: 0
            }
          }
          productSales[item.productId].totalQuantity += item.quantity
          productSales[item.productId].totalRevenue += item.total
        })
      })

      const bestSellers = Object.values(productSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10)

      return handleCORS(NextResponse.json({
        totalRevenue,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        bestSellers
      }))
    }

    // ============ CUSTOMER API ============
    
    // GET /api/customers/[phone]/orders - Get customer's orders
    if (route.match(/\/customers\/[^\/]+\/orders$/) && method === 'GET') {
      const phone = decodeURIComponent(path[1])
      
      const orders = await db.collection('orders')
        .find({ phone })
        .sort({ createdAt: -1 })
        .toArray()

      const cleanOrders = orders.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanOrders))
    }

    // ============ SEED DATA (for testing) ============
    
    // POST /api/seed - Seed initial products
    if (route === '/seed' && method === 'POST') {
      const existingProducts = await db.collection('products').countDocuments()
      
      if (existingProducts > 0) {
        return handleCORS(NextResponse.json({ message: 'Database already seeded' }))
      }

      const sampleProducts = [
        {
          id: uuidv4(),
          name: 'Wireless Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 79.99,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
          stock: 50,
          isInfiniteStock: false,
          allowPickup: true,
          allowDelivery: true,
          deliveryFee: 5.99,
          freeDeliveryZones: ['downtown'],
          createdAt: new Date(),
          deleted: false
        },
        {
          id: uuidv4(),
          name: 'Smart Watch',
          description: 'Fitness tracker with heart rate monitor',
          price: 129.99,
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
          stock: 30,
          isInfiniteStock: false,
          allowPickup: true,
          allowDelivery: true,
          deliveryFee: 5.99,
          freeDeliveryZones: ['downtown', 'suburb'],
          createdAt: new Date(),
          deleted: false
        },
        {
          id: uuidv4(),
          name: 'Laptop Backpack',
          description: 'Durable backpack with laptop compartment',
          price: 49.99,
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
          stock: -1,
          isInfiniteStock: true,
          allowPickup: true,
          allowDelivery: true,
          deliveryFee: 3.99,
          freeDeliveryZones: [],
          createdAt: new Date(),
          deleted: false
        },
        {
          id: uuidv4(),
          name: 'USB-C Cable',
          description: 'Fast charging USB-C cable 2m',
          price: 12.99,
          image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
          stock: -1,
          isInfiniteStock: true,
          allowPickup: true,
          allowDelivery: true,
          deliveryFee: 2.99,
          freeDeliveryZones: ['downtown'],
          createdAt: new Date(),
          deleted: false
        },
        {
          id: uuidv4(),
          name: 'Portable Speaker',
          description: 'Waterproof Bluetooth speaker',
          price: 59.99,
          image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
          stock: 25,
          isInfiniteStock: false,
          allowPickup: true,
          allowDelivery: true,
          deliveryFee: 4.99,
          freeDeliveryZones: ['downtown'],
          createdAt: new Date(),
          deleted: false
        }
      ]

      await db.collection('products').insertMany(sampleProducts)

      return handleCORS(NextResponse.json({ 
        success: true, 
        message: `Seeded ${sampleProducts.length} products` 
      }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: error.message || 'Internal server error' }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute