# Dehadza Store - Technical Architecture

## Overview
Full-stack e-commerce platform with automated stock management, OTP verification, payment processing, and order expiration.

---

## Database Schema (MongoDB)

### Collections

#### 1. **products**
```javascript
{
  id: String (UUID),
  name: String,
  description: String,
  price: Number,
  image: String (URL),
  stock: Number (-1 for infinite),
  isInfiniteStock: Boolean,
  allowPickup: Boolean,
  allowDelivery: Boolean,
  deliveryFee: Number,
  freeDeliveryZones: Array<String>,
  createdAt: Date,
  updatedAt: Date,
  deleted: Boolean,
  deletedAt: Date
}
```

#### 2. **orders**
```javascript
{
  id: String (UUID),
  customerName: String,
  phone: String,
  email: String,
  items: Array<{
    productId: String,
    productName: String,
    price: Number,
    quantity: Number,
    total: Number
  }>,
  subtotal: Number,
  deliveryFee: Number,
  totalAmount: Number,
  status: Enum ['PENDING', 'CONFIRMED', 'PACKAGED', 'READY', 'DELIVERED', 'CANCELLED'],
  phoneVerified: Boolean,
  paymentStatus: Enum ['PENDING', 'PAID'],
  createdAt: Date,
  expiresAt: Date (20 minutes from creation),
  confirmedAt: Date,
  packagedAt: Date,
  readyAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelReason: String,
  deliveryOption: Enum ['pickup', 'delivery'],
  deliveryAddress: String,
  deliveryZone: String,
  updatedAt: Date
}
```

#### 3. **payments**
```javascript
{
  id: String (UUID),
  orderId: String,
  amount: Number,
  method: Enum ['card', 'transfer'],
  status: Enum ['PENDING', 'COMPLETED', 'FAILED'],
  transactionId: String (from Flutterwave),
  reference: String,
  amountPaid: Number,
  createdAt: Date,
  completedAt: Date
}
```

#### 4. **otpVerifications**
```javascript
{
  id: String (UUID),
  orderId: String,
  phone: String,
  otp: String (6 digits),
  verified: Boolean,
  expiresAt: Date (5 minutes),
  createdAt: Date,
  verifiedAt: Date
}
```

#### 5. **reviews**
```javascript
{
  id: String (UUID),
  orderId: String,
  productId: String,
  customerName: String,
  rating: Number (1-5),
  comment: String,
  createdAt: Date
}
```

#### 6. **stockReservations** (future use)
```javascript
{
  id: String (UUID),
  productId: String,
  quantity: Number,
  orderId: String,
  expiresAt: Date
}
```

---

## API Endpoints

### Products API

#### `GET /api/products`
List all active products
```json
Response: [
  {
    "id": "uuid",
    "name": "Product Name",
    "price": 79.99,
    "stock": 50,
    "isInfiniteStock": false,
    ...
  }
]
```

#### `POST /api/products` (Admin)
Create new product
```json
Request: {
  "name": "Product Name",
  "description": "Description",
  "price": 79.99,
  "stock": 50,
  "isInfiniteStock": false,
  "allowPickup": true,
  "allowDelivery": true,
  "deliveryFee": 5.99,
  "freeDeliveryZones": ["downtown"],
  "image": "https://..."
}
```

#### `PUT /api/products/[id]` (Admin)
Update product

#### `DELETE /api/products/[id]` (Admin)
Soft delete product

---

### Orders API

#### `POST /api/orders`
Create new order (reserves stock)
```json
Request: {
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "customerName": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com"
}

Response: {
  "id": "order-uuid",
  "status": "PENDING",
  "expiresAt": "2025-06-25T10:20:00Z",
  "subtotal": 159.98,
  "totalAmount": 159.98,
  ...
}
```

**Business Logic:**
1. Validates stock availability for each item
2. Returns 400 if insufficient stock
3. Decrements product stock immediately (reservation)
4. Sets expiresAt = now + 20 minutes
5. Creates order with PENDING status

#### `PUT /api/orders/[id]/delivery`
Set delivery option and calculate fees
```json
Request: {
  "deliveryOption": "delivery",
  "deliveryAddress": "123 Main St",
  "deliveryZone": "downtown"
}

Response: {
  "success": true,
  "deliveryFee": 5.99,
  "totalAmount": 165.97
}
```

**Business Logic:**
1. Fetches products in order
2. Calculates highest delivery fee
3. Checks if zone is in freeDeliveryZones
4. Updates order with delivery info and new total

#### `POST /api/orders/[id]/verify-phone`
Send OTP to customer phone
```json
Response: {
  "success": true,
  "message": "[MOCKED] OTP sent successfully",
  "mockOtp": "123456"
}
```

**Business Logic:**
1. Generates 6-digit random OTP
2. Stores in otpVerifications with 5-min expiry
3. Sends SMS via Africa's Talking (mocked)
4. Returns OTP for testing (remove in production)

#### `POST /api/orders/[id]/confirm-otp`
Verify OTP code
```json
Request: {
  "otp": "123456"
}

Response: {
  "success": true,
  "message": "Phone verified successfully"
}
```

**Business Logic:**
1. Looks up OTP in database
2. Validates not expired and not already used
3. Marks OTP as verified
4. Updates order.phoneVerified = true

#### `POST /api/orders/[id]/payment`
Initiate payment
```json
Request: {
  "paymentMethod": "card"
}

Response: {
  "success": true,
  "paymentLink": "https://checkout.flutterwave.com/...",
  "transactionId": "FLW_123",
  "reference": "REF_orderid_timestamp"
}
```

**Business Logic:**
1. Verifies phone is verified
2. Initiates payment with Flutterwave (mocked)
3. Creates payment record with PENDING status
4. Returns payment link for customer

#### `POST /api/orders/[id]/confirm-payment`
Confirm payment completion
```json
Request: {
  "transactionId": "FLW_123",
  "amountPaid": 165.97
}

Response: {
  "success": true,
  "message": "[MOCKED] Payment confirmed, receipt sent",
  "orderId": "uuid"
}
```

**Business Logic:**
1. Verifies payment with provider (mocked)
2. Checks amountPaid >= order.totalAmount
3. Returns 400 if insufficient amount
4. Updates payment status to COMPLETED
5. Updates order status to CONFIRMED
6. Generates and sends receipt email (mocked)
7. Sends notification to admin (mocked)

#### `PUT /api/orders/[id]/status` (Admin)
Update order status
```json
Request: {
  "status": "PACKAGED"
}
```

**Valid Status Transitions:**
- PENDING → CONFIRMED (via payment)
- CONFIRMED → PACKAGED (admin)
- PACKAGED → READY (admin)
- READY → DELIVERED (admin)
- Any → CANCELLED (system or admin)

#### `GET /api/orders`
List orders with filters (Admin)
```
Query Params:
- status: PENDING | CONFIRMED | PACKAGED | READY | DELIVERED | CANCELLED
- startDate: ISO date
- endDate: ISO date

Response: Array of orders
```

---

### Customer API

#### `GET /api/customers/[phone]/orders`
Track orders by phone number
```
Example: /api/customers/+1234567890/orders
Response: Array of customer's orders
```

---

### Reviews API

#### `POST /api/reviews`
Submit product review
```json
Request: {
  "orderId": "uuid",
  "productId": "uuid",
  "customerName": "John Doe",
  "rating": 5,
  "comment": "Great product!"
}

Error if order.status !== 'DELIVERED': {
  "error": "Reviews can only be submitted after delivery"
}
```

#### `GET /api/reviews?productId=[id]`
Get reviews for a product

---

### Admin API

#### `GET /api/admin/dashboard`
Get comprehensive analytics
```
Query Params:
- startDate: ISO date (optional)
- endDate: ISO date (optional)

Response: {
  "totalRevenue": 12345.67,
  "totalOrders": 150,
  "pendingOrders": 5,
  "deliveredOrders": 120,
  "bestSellers": [
    {
      "productId": "uuid",
      "productName": "Product",
      "totalQuantity": 45,
      "totalRevenue": 3599.55
    }
  ]
}
```

**Calculation Logic:**
- Revenue only counts CONFIRMED+ orders (not PENDING/CANCELLED)
- Best sellers sorted by total quantity sold
- Date filtering applies to order.createdAt

---

## Background Jobs

### Order Expiration Job
**Runs every:** 60 seconds  
**Started:** Automatically when server starts

**Logic:**
```javascript
setInterval(async () => {
  const now = new Date()
  
  // Find expired pending orders
  const expiredOrders = await db.collection('orders').find({ 
    status: 'PENDING', 
    expiresAt: { $lt: now } 
  }).toArray()
  
  for (const order of expiredOrders) {
    // Restore stock for each item
    for (const item of order.items) {
      await db.collection('products').updateOne(
        { id: item.productId },
        { $inc: { stock: item.quantity } }
      )
    }
    
    // Cancel order
    await db.collection('orders').updateOne(
      { id: order.id },
      { $set: { 
        status: 'CANCELLED', 
        cancelledAt: now, 
        cancelReason: 'Payment timeout' 
      }}
    )
  }
}, 60000)
```

**Monitoring:**
Check logs for expiration events:
```bash
tail -f /var/log/supervisor/nextjs.out.log | grep "expired"
```

---

## Business Rules Implementation

### 1. Stock Management
**Reservation:** Stock decremented immediately on order creation  
**Restoration:** Stock returned if order cancelled or expires  
**Infinite Stock:** Products with stock = -1 never run out

### 2. Order Lifecycle
```
Customer creates order → status: PENDING
  ↓
20-minute timer starts
  ↓
Phone verification (OTP)
  ↓
Payment initiated
  ↓
Payment confirmed → status: CONFIRMED
  ↓ (Admin actions)
Admin marks as PACKAGED
  ↓
Admin marks as READY
  ↓
Admin marks as DELIVERED
  ↓
Customer can leave review
```

### 3. Payment Validation
```javascript
if (amountPaid < order.totalAmount) {
  return error('Insufficient payment')
}
// Amount can be greater (customer overpays)
```

### 4. Review Restrictions
- Only after order status = DELIVERED
- Must be for product in that order
- One review per product per order

### 5. Delivery Fee Calculation
```javascript
// For each product in order:
if (deliveryZone in product.freeDeliveryZones) {
  fee = 0
} else {
  fee = product.deliveryFee
}

// Use highest fee from all products
finalDeliveryFee = Math.max(...productFees)
```

---

## Frontend Architecture

### Component Structure
Single-page application with tabs:
- **Store Tab:** Product grid, add to cart
- **Cart Tab:** View cart, proceed to checkout
- **Track Tab:** Order tracking by phone
- **Admin Tab:** Dashboard, products, orders

### State Management
Uses React useState hooks:
- `products`: Product catalog
- `cart`: Shopping cart items
- `currentOrder`: Active order during checkout
- `orders`: Admin order list
- `dashboardStats`: Admin analytics

### Checkout Flow State Machine
```javascript
checkoutStep:
  1 → Customer Info
  2 → Delivery Option
  3 → OTP Verification
  4 → Payment
  
On completion → Reset to step 1
```

---

## Testing Notes

### Manual Testing Checklist

**Customer Flow:**
- [ ] Seed products
- [ ] Add product to cart
- [ ] Update cart quantities
- [ ] Remove from cart
- [ ] Start checkout
- [ ] Enter customer info
- [ ] Choose pickup (no delivery fee)
- [ ] Choose delivery (with fee)
- [ ] Verify mock OTP displayed
- [ ] Enter OTP correctly
- [ ] Test wrong OTP
- [ ] Initiate payment
- [ ] Confirm with correct amount
- [ ] Confirm with insufficient amount (should fail)
- [ ] Track order by phone

**Admin Flow:**
- [ ] View dashboard stats
- [ ] Filter orders by status
- [ ] Filter sales by date
- [ ] Create new product
- [ ] Edit product
- [ ] Delete product
- [ ] Update order status (CONFIRMED → PACKAGED → READY → DELIVERED)
- [ ] View best sellers

**Order Expiration:**
- [ ] Create order, don't pay
- [ ] Wait 20+ minutes
- [ ] Check if order status changed to CANCELLED
- [ ] Check if stock was restored

**Reviews:**
- [ ] Try to review before delivery (should fail)
- [ ] Update order to DELIVERED
- [ ] Submit review successfully
- [ ] View reviews for product

---

## Performance Considerations

### Database Indexes (Recommended)
```javascript
// Add these indexes for better performance
db.products.createIndex({ id: 1 })
db.products.createIndex({ deleted: 1 })
db.orders.createIndex({ id: 1 })
db.orders.createIndex({ phone: 1 })
db.orders.createIndex({ status: 1, expiresAt: 1 })
db.orders.createIndex({ createdAt: -1 })
db.payments.createIndex({ orderId: 1 })
db.payments.createIndex({ transactionId: 1 })
db.otpVerifications.createIndex({ orderId: 1, otp: 1 })
db.otpVerifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
db.reviews.createIndex({ productId: 1 })
db.reviews.createIndex({ orderId: 1 })
```

### Caching Strategy
Consider adding:
- Product catalog caching (5 minutes)
- Dashboard stats caching (1 minute)
- Customer order history caching

### Pagination
For production, add pagination:
```javascript
const { page = 1, limit = 20 } = searchParams
const skip = (page - 1) * limit

const products = await db.collection('products')
  .find(query)
  .skip(skip)
  .limit(limit)
  .toArray()
```

---

## Security Recommendations

### 1. Authentication & Authorization
```javascript
// Add JWT-based admin auth
import jwt from 'jsonwebtoken'

async function verifyAdmin(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('No token')
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  return decoded
}

// Protect admin routes
if (route.startsWith('/admin/') || 
    (route.startsWith('/products') && method !== 'GET')) {
  await verifyAdmin(request)
}
```

### 2. Input Sanitization
```javascript
import { z } from 'zod'

const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/)
const emailSchema = z.string().email()
const priceSchema = z.number().positive()
```

### 3. Rate Limiting
```javascript
// Limit OTP requests
const otpCount = await db.collection('otpVerifications')
  .countDocuments({
    phone,
    createdAt: { $gt: new Date(Date.now() - 60000) }
  })

if (otpCount >= 3) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

### 4. Payment Security
- Never store card details
- Use Flutterwave's secure checkout
- Verify webhook signatures
- Log all payment attempts

---

## Error Handling

### API Error Responses
```javascript
// 400 - Bad Request
{ error: "Specific validation error message" }

// 404 - Not Found
{ error: "Resource not found" }

// 500 - Internal Server Error
{ error: "Internal server error" }
```

### Frontend Error Handling
All API calls wrapped in try-catch with toast notifications

---

## Deployment Guide

### Environment Variables
```env
# Production
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=dehadza_store_prod
NEXT_PUBLIC_BASE_URL=https://dehadza.com
CORS_ORIGINS=https://dehadza.com

# API Keys
AFRICASTALKING_API_KEY=live_xxx
AFRICASTALKING_USERNAME=your_username
FLUTTERWAVE_SECRET_KEY=live_xxx
FLUTTERWAVE_PUBLIC_KEY=live_xxx
SENDGRID_API_KEY=live_xxx
SENDGRID_FROM_EMAIL=noreply@dehadza.com
JWT_SECRET=your_secret_key
```

### Build & Deploy
```bash
# Build production
yarn build

# Start production server
yarn start

# Or deploy to Vercel
vercel deploy --prod
```

---

## Monitoring & Maintenance

### Logs to Monitor
```bash
# Order expirations
grep "expired and cancelled" logs

# Payment confirmations
grep "Payment confirmed" logs

# OTP sending
grep "Sending OTP" logs

# API errors
grep "API Error" logs
```

### Database Maintenance
```javascript
// Clean up old OTP records (older than 1 day)
db.otpVerifications.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 86400000) }
})

// Archive old orders (older than 1 year)
db.orders_archive.insertMany(
  db.orders.find({ 
    createdAt: { $lt: new Date(Date.now() - 31536000000) } 
  }).toArray()
)
```

---

## Known Limitations & Future Enhancements

### Current Limitations
1. No admin authentication
2. No product categories/search
3. No inventory alerts
4. No customer accounts
5. Single currency (USD)
6. No bulk operations

### Recommended Enhancements
1. **Multi-currency support**
2. **Product variants** (size, color)
3. **Discount codes/coupons**
4. **Inventory low stock alerts**
5. **Customer loyalty program**
6. **Order notes/special instructions**
7. **Shipping tracking integration**
8. **Analytics dashboard with charts**
9. **Export orders to CSV**
10. **Backup/restore functionality**

---

## Architecture Decisions

### Why Next.js API Routes?
- Serverless, scales automatically
- Same codebase for frontend & backend
- Easy deployment (Vercel, etc.)
- Built-in optimization

### Why MongoDB?
- Flexible schema for e-commerce
- Fast for read-heavy operations
- Easy to scale
- Good for JSON data

### Why Background Jobs in-process?
- Simple implementation for MVP
- No external job queue needed
- Works well for low-volume stores

**For high-volume production:**
- Use external job queue (Bull, BullMQ)
- Deploy separate worker service
- Use Redis for job management

### Why UUID instead of MongoDB ObjectId?
- JSON serializable
- URL-friendly
- No vendor lock-in
- Easier to work with in frontend

---

## Code Quality

### Follows Best Practices:
✅ RESTful API design  
✅ Proper error handling  
✅ Transaction-like operations  
✅ Input validation  
✅ CORS configuration  
✅ Environment variable usage  
✅ Separation of concerns  
✅ Reusable components  
✅ Responsive design  
✅ Semantic HTML  

---

## Support & Troubleshooting

### Common Issues

**1. "Cannot connect to MongoDB"**
- Check MongoDB is running
- Verify MONGO_URL in .env
- Check network connectivity

**2. "Order not expiring"**
- Background job runs every 60 seconds
- Check server logs for job execution
- Verify expiresAt is set correctly

**3. "Stock not restoring"**
- Check if order was cancelled properly
- Verify stock increment logic
- Check for infinite stock products

**4. "OTP not working"**
- OTP expires after 5 minutes
- Check otpVerifications collection
- Verify phone number format

---

## API Testing with curl

```bash
# Seed products
curl -X POST http://localhost:3000/api/seed

# List products
curl http://localhost:3000/api/products

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "uuid", "quantity": 1}],
    "customerName": "Test User",
    "phone": "+1234567890",
    "email": "test@example.com"
  }'

# Track orders
curl "http://localhost:3000/api/customers/%2B1234567890/orders"

# Admin dashboard
curl "http://localhost:3000/api/admin/dashboard?startDate=2025-01-01&endDate=2025-12-31"
```

---

**Version:** 1.0  
**Last Updated:** June 2025  
**Author:** Dehadza Store Team
