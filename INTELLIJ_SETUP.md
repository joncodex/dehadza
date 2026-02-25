# Dehadza Store - IntelliJ Setup Guide

## Project Overview
Full-stack e-commerce platform built with Next.js + MongoDB

## Download the Code

### Option 1: Download ZIP
The project has been packaged as `dehadza-store.zip` (126KB) in the `/app` directory.

To download:
1. Access your Emergent workspace file browser
2. Navigate to `/app/dehadza-store.zip`
3. Download to your local machine
4. Extract the ZIP file

### Option 2: Git Clone (if you have repo access)
```bash
git clone <your-repo-url>
cd dehadza-store
```

## IntelliJ IDEA Setup

### Prerequisites
- Node.js 18+ installed
- MongoDB installed locally OR use MongoDB Atlas
- Yarn package manager (`npm install -g yarn`)

### Step 1: Open Project in IntelliJ
1. Open IntelliJ IDEA
2. File → Open → Select the extracted `dehadza-store` folder
3. IntelliJ will detect it as a JavaScript/Node.js project

### Step 2: Install Dependencies
Open Terminal in IntelliJ (Alt+F12 / Option+F12):
```bash
yarn install
```

### Step 3: Configure Environment Variables
Create/edit `.env` file in project root:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dehadza_store
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CORS_ORIGINS=*
```

**For MongoDB Atlas (Cloud):**
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=dehadza_store
```

### Step 4: Start MongoDB (if using local)
```bash
# macOS
brew services start mongodb-community

# Windows
net start MongoDB

# Linux
sudo systemctl start mongod
```

### Step 5: Run Development Server
In IntelliJ Terminal:
```bash
yarn dev
```

App will be available at: `http://localhost:3000`

## Project Structure

```
dehadza-store/
├── app/
│   ├── api/[[...path]]/route.js  # Backend API routes (all endpoints)
│   ├── page.js                    # Frontend UI (customer + admin)
│   ├── layout.js                  # Root layout
│   └── globals.css                # Global styles
├── components/ui/                 # Shadcn UI components
├── lib/utils.js                   # Utility functions
├── hooks/                         # React hooks
├── .env                           # Environment variables
├── package.json                   # Dependencies
└── tailwind.config.js             # Tailwind configuration
```

## Key Files to Understand

### 1. `/app/app/api/[[...path]]/route.js` (Backend)
All API endpoints in one file:
- **Products API:** CRUD operations, stock management
- **Orders API:** Create, retrieve, update status
- **OTP API:** Send and verify OTP (mocked)
- **Payment API:** Initiate and confirm payment (mocked)
- **Admin API:** Dashboard stats, best sellers
- **Reviews API:** Create and retrieve reviews
- **Background Job:** Order expiration checker (runs every 60s)

### 2. `/app/app/page.js` (Frontend)
Full UI with 4 tabs:
- **Store:** Product catalog with cart
- **Cart:** Review items, proceed to checkout
- **Track:** Order tracking by phone
- **Admin:** Dashboard, product/order management

## Testing the Application

### 1. Seed Sample Data
Click "Seed Products" button in UI, or use API:
```bash
curl -X POST http://localhost:3000/api/seed
```

### 2. Test Complete Order Flow
1. Add products to cart
2. Click "Proceed to Checkout"
3. Enter customer details
4. Choose delivery option
5. Use the displayed mock OTP (6 digits)
6. Simulate payment by entering order total

### 3. Test Admin Dashboard
1. Switch to "Admin" tab
2. View revenue and order statistics
3. Manage products (add, edit, delete)
4. Update order status
5. View best-selling products

## API Endpoints Reference

### Products
```
GET    /api/products              - List all products
POST   /api/products              - Create product (admin)
GET    /api/products/[id]         - Get product by ID
PUT    /api/products/[id]         - Update product (admin)
DELETE /api/products/[id]         - Delete product (admin)
```

### Orders
```
POST   /api/orders                      - Create order
GET    /api/orders                      - List orders (admin)
GET    /api/orders/[id]                 - Get order by ID
PUT    /api/orders/[id]/delivery        - Set delivery option
POST   /api/orders/[id]/verify-phone    - Send OTP
POST   /api/orders/[id]/confirm-otp     - Verify OTP
POST   /api/orders/[id]/payment         - Initiate payment
POST   /api/orders/[id]/confirm-payment - Confirm payment
PUT    /api/orders/[id]/status          - Update status (admin)
```

### Customer & Reviews
```
GET    /api/customers/[phone]/orders    - Track orders by phone
POST   /api/reviews                     - Submit review
GET    /api/reviews?productId=[id]      - Get product reviews
```

### Admin
```
GET    /api/admin/dashboard?startDate=&endDate= - Dashboard stats
```

## MOCKED Integrations

The following services are currently mocked for testing:

### 1. Africa's Talking (OTP)
- Location: `MockServices.sendOTP()` in route.js
- Mock OTP is returned in API response for testing
- To integrate real API: Replace with Africa's Talking SDK

### 2. Flutterwave (Payment)
- Location: `MockServices.initiatePayment()` and `MockServices.verifyPayment()`
- Returns mock payment link and transaction ID
- To integrate real API: Replace with Flutterwave SDK

### 3. SendGrid (Email)
- Location: `MockServices.sendEmail()`
- Logs emails to console
- To integrate real API: Replace with SendGrid SDK

## Important Business Logic

### Stock Reservation
When order is created:
1. Stock is immediately decremented from products
2. Order gets 20-minute expiration timer
3. If payment not completed → stock restored automatically

### Order Expiration Job
Background job runs every 60 seconds:
- Finds orders with status=PENDING and expiresAt < now
- Cancels order
- Restores stock to products
- Logged in console

### Order Status Flow
```
PENDING → CONFIRMED → PACKAGED → READY → DELIVERED
```
- Reviews only allowed after DELIVERED status
- Admin manages status progression

## Troubleshooting

### MongoDB Connection Issues
```javascript
// Check if MongoDB is running
// macOS/Linux: sudo systemctl status mongod
// Windows: services.msc (check MongoDB service)

// Update MONGO_URL in .env file
MONGO_URL=mongodb://localhost:27017
```

### Port Already in Use
```bash
# Kill process on port 3000
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart
yarn dev
```

### Hot Reload Not Working
1. Stop server (Ctrl+C)
2. Delete `.next` folder
3. Run `yarn dev` again

## Next Steps for Production

### 1. Integrate Real APIs
Replace mock services with actual integrations:
- Get Africa's Talking API credentials
- Get Flutterwave API keys
- Get SendGrid API key

### 2. Add Authentication
- Implement admin authentication (JWT or session-based)
- Protect admin routes
- Add role-based access control

### 3. Enhanced Features
- Email notifications at each order stage
- SMS notifications for order updates
- Product categories and search
- Inventory management
- Customer accounts with order history

### 4. Deploy to Production
- Set up production MongoDB (MongoDB Atlas)
- Configure production environment variables
- Deploy to Vercel, AWS, or your preferred platform

## Support

For questions or issues:
- Check console logs for error details
- Review API responses in Network tab
- Verify MongoDB is running and accessible
- Check environment variables are set correctly

---

**Built with:** Next.js 14, MongoDB, Tailwind CSS, Shadcn UI
