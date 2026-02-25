# API Integration Guide - Replacing Mocked Services

This guide shows how to replace the mocked integrations with real APIs.

## Current Mocked Services

All mocked services are in `/app/app/api/[[...path]]/route.js`:

```javascript
const MockServices = {
  sendOTP(phone, otp) { ... },
  initiatePayment(orderId, amount, email, phone) { ... },
  verifyPayment(transactionId) { ... },
  sendEmail(to, subject, html) { ... }
}
```

---

## 1. Africa's Talking (SMS/OTP Integration)

### Get API Credentials
1. Sign up at: https://africastalking.com/
2. Get your API Key and Username from dashboard
3. Add credits for SMS sending

### Update .env
```env
AFRICASTALKING_API_KEY=your_api_key_here
AFRICASTALKING_USERNAME=your_username_here
```

### Install SDK
```bash
yarn add africastalking
```

### Replace Mock Code

**Find this in route.js:**
```javascript
async sendOTP(phone, otp) {
  console.log(`[MOCKED] Sending OTP ${otp} to ${phone} via Africa's Talking`)
  return { success: true, messageId: `mock_${uuidv4()}` }
}
```

**Replace with:**
```javascript
import AfricasTalking from 'africastalking'

const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
})

async sendOTP(phone, otp) {
  try {
    const sms = africastalking.SMS
    const result = await sms.send({
      to: [phone],
      message: `Your Dehadza Store verification code is: ${otp}. Valid for 5 minutes.`,
      from: 'DEHADZA' // Your shortcode/sender ID
    })
    
    return { 
      success: true, 
      messageId: result.SMSMessageData.Recipients[0].messageId 
    }
  } catch (error) {
    console.error('Africa\'s Talking error:', error)
    throw error
  }
}
```

---

## 2. Flutterwave (Payment Integration)

### Get API Credentials
1. Sign up at: https://flutterwave.com/
2. Get API keys from Settings → API
3. Use Test keys for development, Live keys for production

### Update .env
```env
FLUTTERWAVE_SECRET_KEY=your_secret_key_here
FLUTTERWAVE_PUBLIC_KEY=your_public_key_here
FLUTTERWAVE_ENCRYPTION_KEY=your_encryption_key_here
```

### Install SDK
```bash
yarn add flutterwave-node-v3
```

### Replace Mock Code

**Initiate Payment - Find:**
```javascript
async initiatePayment(orderId, amount, email, phone) {
  console.log(`[MOCKED] Initiating Flutterwave payment...`)
  return { 
    success: true, 
    paymentLink: `https://mock-flutterwave.com/pay/${orderId}`,
    transactionId: `FLW_MOCK_${uuidv4()}`,
    reference: `REF_${orderId}_${Date.now()}`
  }
}
```

**Replace with:**
```javascript
import Flutterwave from 'flutterwave-node-v3'

const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
)

async initiatePayment(orderId, amount, email, phone) {
  try {
    const reference = `REF_${orderId}_${Date.now()}`
    
    const payload = {
      tx_ref: reference,
      amount: amount,
      currency: "USD", // or "NGN", "KES", etc.
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback`,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: email,
        phone_number: phone,
        name: "Customer"
      },
      customizations: {
        title: "Dehadza Store",
        description: `Payment for order ${orderId}`,
        logo: "https://your-logo-url.com/logo.png"
      }
    }

    const response = await flw.Charge.card(payload)
    
    return {
      success: true,
      paymentLink: response.meta.authorization.redirect,
      transactionId: response.data.id,
      reference: reference
    }
  } catch (error) {
    console.error('Flutterwave error:', error)
    throw error
  }
}
```

**Verify Payment - Find:**
```javascript
async verifyPayment(transactionId) {
  console.log(`[MOCKED] Verifying Flutterwave payment: ${transactionId}`)
  return { 
    success: true, 
    status: 'successful',
    amount: 0,
    transactionId 
  }
}
```

**Replace with:**
```javascript
async verifyPayment(transactionId) {
  try {
    const response = await flw.Transaction.verify({ id: transactionId })
    
    if (response.data.status === "successful" && 
        response.data.amount >= response.data.meta.amount) {
      return {
        success: true,
        status: 'successful',
        amount: response.data.amount,
        transactionId: response.data.id
      }
    }
    
    return {
      success: false,
      status: response.data.status,
      message: 'Payment verification failed'
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    throw error
  }
}
```

### Add Webhook Endpoint (Recommended)
Create new route for Flutterwave webhooks:

Add to route.js:
```javascript
// POST /api/webhooks/flutterwave - Payment webhook
if (route === '/webhooks/flutterwave' && method === 'POST') {
  const body = await request.json()
  
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_KEY)
    .update(JSON.stringify(body))
    .digest('hex')
  
  if (hash !== request.headers.get('verif-hash')) {
    return handleCORS(NextResponse.json({ error: 'Invalid signature' }, { status: 401 }))
  }

  // Process payment confirmation
  const { tx_ref, amount, status } = body.data
  
  if (status === 'successful') {
    // Extract orderId from reference
    const orderId = tx_ref.split('_')[1]
    
    // Confirm payment
    await confirmPaymentInternal(orderId, amount, tx_ref)
  }
  
  return handleCORS(NextResponse.json({ success: true }))
}
```

---

## 3. SendGrid (Email Integration)

### Get API Credentials
1. Sign up at: https://sendgrid.com/
2. Create API Key: Settings → API Keys
3. Verify sender email/domain

### Update .env
```env
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@dehadza.com
```

### Install SDK
```bash
yarn add @sendgrid/mail
```

### Replace Mock Code

**Find:**
```javascript
async sendEmail(to, subject, html) {
  console.log(`[MOCKED] Sending email via SendGrid to ${to}: ${subject}`)
  return { success: true, messageId: `sg_mock_${uuidv4()}` }
}
```

**Replace with:**
```javascript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

async sendEmail(to, subject, html) {
  try {
    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      html: html
    }
    
    const response = await sgMail.send(msg)
    
    return { 
      success: true, 
      messageId: response[0].headers['x-message-id'] 
    }
  } catch (error) {
    console.error('SendGrid error:', error)
    throw error
  }
}
```

### Improve Receipt Email Template

Create a better HTML template for receipts:
```javascript
function generateReceiptHtml(order) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-items { border-collapse: collapse; width: 100%; margin: 20px 0; }
        .order-items th, .order-items td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .total { font-size: 1.2em; font-weight: bold; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Order Confirmed!</h1>
        <p>Thank you for shopping at Dehadza Store</p>
      </div>
      <div class="content">
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        
        <h3>Items Ordered:</h3>
        <table class="order-items">
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
          ${order.items.map(item => `
            <tr>
              <td>${item.productName}</td>
              <td>${item.quantity}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>$${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        
        <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
        <p><strong>Delivery Fee:</strong> $${order.deliveryFee.toFixed(2)}</p>
        <p class="total">Total Paid: $${order.totalAmount.toFixed(2)}</p>
        
        <h3>Delivery Information</h3>
        <p>${order.deliveryOption === 'pickup' 
          ? '📦 <strong>Pickup from Store</strong>' 
          : `🚚 <strong>Delivery to:</strong><br>${order.deliveryAddress}`
        }</p>
        
        <p>Track your order status at: ${process.env.NEXT_PUBLIC_BASE_URL}</p>
      </div>
    </body>
    </html>
  `
}
```

---

## Testing Real Integrations

### 1. Test Mode First
All services provide test/sandbox environments:
- **Africa's Talking:** Use test numbers
- **Flutterwave:** Use test cards (4187427415564246)
- **SendGrid:** Verify emails only go to verified addresses

### 2. Error Handling
Add comprehensive error handling:
```javascript
try {
  await MockServices.sendOTP(phone, otp)
} catch (error) {
  // Log error
  console.error('OTP send failed:', error)
  
  // Store failure in database
  await db.collection('failedOtps').insertOne({
    phone,
    error: error.message,
    createdAt: new Date()
  })
  
  // Return user-friendly error
  return NextResponse.json({
    error: 'Failed to send OTP. Please try again.'
  }, { status: 500 })
}
```

### 3. Monitoring & Logs
Add logging for production:
```javascript
// Log all payment attempts
await db.collection('paymentLogs').insertOne({
  orderId,
  amount,
  status: 'initiated',
  provider: 'flutterwave',
  timestamp: new Date()
})
```

---

## Environment Variables Checklist

Before deploying to production, ensure all are set:

```env
# Database
MONGO_URL=mongodb+srv://...
DB_NAME=dehadza_store_prod

# App
NEXT_PUBLIC_BASE_URL=https://dehadza.com
CORS_ORIGINS=https://dehadza.com

# Africa's Talking
AFRICASTALKING_API_KEY=live_key_here
AFRICASTALKING_USERNAME=your_username

# Flutterwave
FLUTTERWAVE_SECRET_KEY=live_key_here
FLUTTERWAVE_PUBLIC_KEY=live_key_here
FLUTTERWAVE_ENCRYPTION_KEY=live_key_here

# SendGrid
SENDGRID_API_KEY=live_key_here
SENDGRID_FROM_EMAIL=noreply@dehadza.com
```

---

## Additional Enhancements

### 1. Add Redis for Better Performance
Currently, OTP and expiration use MongoDB. Redis is better for:
- Temporary data (OTP, sessions)
- Fast expiration handling
- Better performance

### 2. Add Product Images Upload
Integrate with:
- AWS S3
- Cloudinary
- Uploadcare

### 3. Add Search & Filters
```javascript
// Add to GET /api/products
const { search, category, minPrice, maxPrice } = searchParams

const query = { deleted: { $ne: true } }
if (search) {
  query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } }
  ]
}
if (minPrice || maxPrice) {
  query.price = {}
  if (minPrice) query.price.$gte = parseFloat(minPrice)
  if (maxPrice) query.price.$lte = parseFloat(maxPrice)
}
```

### 4. Add Customer Accounts
- User registration/login
- Saved addresses
- Order history
- Wishlist

### 5. Add Product Categories
```javascript
// Add to products schema
categories: ['Electronics', 'Fashion', 'Home'],
tags: ['trending', 'sale', 'new-arrival']
```

---

## Security Best Practices

### 1. API Authentication
Add admin authentication:
```javascript
function verifyAdminToken(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  // Verify JWT token
  // Return user info or throw error
}

// Protect admin routes
if (route.startsWith('/admin/') || route.startsWith('/products') && method !== 'GET') {
  const admin = await verifyAdminToken(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### 2. Rate Limiting
Prevent abuse on OTP endpoint:
```javascript
// Track OTP requests per phone
const recentOtps = await db.collection('otpVerifications')
  .countDocuments({
    phone: order.phone,
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
  })

if (recentOtps >= 3) {
  return NextResponse.json({
    error: 'Too many OTP requests. Please try again later.'
  }, { status: 429 })
}
```

### 3. Input Validation
Add Zod schemas:
```javascript
import { z } from 'zod'

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1),
  customerName: z.string().min(2),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email()
})

// Validate
const validated = orderSchema.parse(body)
```

---

## Production Deployment Checklist

- [ ] Replace all mock services with real APIs
- [ ] Set production environment variables
- [ ] Enable CORS only for your domain
- [ ] Add authentication for admin routes
- [ ] Set up MongoDB indexes for performance
- [ ] Configure webhook URLs with providers
- [ ] Test payment flow with real cards
- [ ] Set up error monitoring (Sentry)
- [ ] Configure email templates
- [ ] Add rate limiting
- [ ] Enable HTTPS
- [ ] Test order expiration job in production
- [ ] Set up automated backups

---

## Support Resources

- **Africa's Talking Docs:** https://developers.africastalking.com/
- **Flutterwave Docs:** https://developer.flutterwave.com/docs
- **SendGrid Docs:** https://docs.sendgrid.com/
- **Next.js Docs:** https://nextjs.org/docs
- **MongoDB Docs:** https://www.mongodb.com/docs/

---

**Need help with integration?** Provide your API keys and I can help implement the real integrations.
