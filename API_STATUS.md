# API Status & Database Connection Guide

## ✅ API Endpoints Status

All API endpoints are properly configured and registered:

### Authentication APIs (`/api/auth`)
- ✅ POST `/api/auth/register` - User registration
- ✅ POST `/api/auth/register-company` - Company registration
- ✅ POST `/api/auth/login` - User login
- ✅ GET `/api/auth/logout` - User logout
- ✅ GET `/api/auth/me` - Get current user
- ✅ PUT `/api/auth/updatedetails` - Update user details
- ✅ PUT `/api/auth/updatepassword` - Update password

### Product APIs (`/api/products`)
- ✅ GET `/api/products` - Get all products
- ✅ GET `/api/products/:id` - Get single product
- ✅ POST `/api/products` - Create product (Owner/Admin)
- ✅ PUT `/api/products/:id` - Update product (Owner/Admin)
- ✅ DELETE `/api/products/:id` - Delete product (Owner/Admin)
- ✅ PATCH `/api/products/:id/stock` - Update stock (Owner/Admin)

### Order APIs (`/api/orders`)
- ✅ GET `/api/orders` - Get all orders
- ✅ GET `/api/orders/:id` - Get single order
- ✅ POST `/api/orders` - Create order
- ✅ PUT `/api/orders/:id` - Update order
- ✅ PATCH `/api/orders/:id/status` - Update order status
- ✅ GET `/api/orders/statistics` - Get order statistics

### Category APIs (`/api/categories`)
- ✅ GET `/api/categories` - Get all categories
- ✅ GET `/api/categories/:id` - Get single category
- ✅ POST `/api/categories` - Create category (Owner/Admin)
- ✅ PUT `/api/categories/:id` - Update category (Owner/Admin)
- ✅ DELETE `/api/categories/:id` - Delete category (Owner/Admin)

### Brand APIs (`/api/brands`)
- ✅ GET `/api/brands` - Get all brands
- ✅ GET `/api/brands/:id` - Get single brand
- ✅ POST `/api/brands` - Create brand (Owner/Admin)
- ✅ PUT `/api/brands/:id` - Update brand (Owner/Admin)
- ✅ DELETE `/api/brands/:id` - Delete brand (Owner/Admin)

### Account APIs (`/api/accounts`)
- ✅ GET `/api/accounts` - Get all accounts
- ✅ GET `/api/accounts/:id` - Get single account
- ✅ POST `/api/accounts` - Create account (Owner/Admin)
- ✅ PUT `/api/accounts/:id` - Update account (Owner/Admin)
- ✅ DELETE `/api/accounts/:id` - Delete account (Owner/Admin)

### Calendar APIs (`/api/calendar`)
- ✅ GET `/api/calendar` - Get calendar events
- ✅ GET `/api/calendar/:id` - Get single event
- ✅ POST `/api/calendar` - Create event
- ✅ PUT `/api/calendar/:id` - Update event
- ✅ DELETE `/api/calendar/:id` - Delete event
- ✅ POST `/api/calendar/report` - Send report (Salesman)

### User Management APIs (`/api/user-management`)
- ✅ GET `/api/user-management` - Get users
- ✅ POST `/api/user-management` - Create user (Owner/Admin)
- ✅ PATCH `/api/user-management/:id` - Update user (Owner/Admin)
- ✅ DELETE `/api/user-management/:id` - Delete user (Owner/Admin)

### Upload APIs (`/api/upload`)
- ✅ POST `/api/upload/image` - Upload image (Owner/Admin)
- ✅ POST `/api/upload/pdf` - Upload PDF (Accountant/Owner/Admin)

### Company APIs (`/api/companies`)
- ✅ GET `/api/companies` - Get companies
- ✅ GET `/api/companies/:id` - Get single company
- ✅ POST `/api/companies/register` - Register company
- ✅ PUT `/api/companies/:id` - Update company

### Admin APIs (`/api/admin`)
- ✅ Admin-specific endpoints

## 🔍 Health Check Endpoints

### Basic Health Check
```
GET /health
```
Returns server status and database connection status.

### Database Health Check
```
GET /health/db
```
Returns detailed database connection information and test query results.

## 🗄️ Database Connection

### Connection Configuration
- **Default URI**: `mongodb://localhost:27017/oneplace`
- **Environment Variable**: `MONGODB_URI`
- **Connection Options**:
  - Server selection timeout: 5 seconds
  - Socket timeout: 45 seconds
  - Auto-reconnect enabled

### Testing Database Connection

1. **Using npm script**:
   ```bash
   npm run test:db
   ```

2. **Manual test**:
   ```bash
   node utils/testConnection.js
   ```

3. **Health check endpoint**:
   ```bash
   curl http://localhost:5000/health/db
   ```

### Database Models
All models are properly configured:
- ✅ User
- ✅ Company
- ✅ Product
- ✅ Order
- ✅ Category
- ✅ Brand
- ✅ Account
- ✅ Calendar
- ✅ Admin

## 🚀 Starting the Server

1. **Ensure MongoDB is running**:
   - Local: `mongod` or MongoDB service
   - Cloud: Set `MONGODB_URI` in `.env`

2. **Set environment variables** (create `.env` file):
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/oneplace
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

4. **Verify APIs**:
   ```bash
   npm run verify:apis
   ```

## ✅ Verification Checklist

- [x] All routes registered in server.js
- [x] All route files exist
- [x] All controller files exist
- [x] All model files exist
- [x] Database connection configured
- [x] Health check endpoints available
- [x] Error handling implemented
- [x] Security middleware applied

## 🔧 Troubleshooting

### Database Connection Issues
1. Check if MongoDB is running: `mongosh` or check service status
2. Verify `MONGODB_URI` in `.env` file
3. Check network connectivity
4. Review connection logs in server output

### API Not Responding
1. Check server is running: `GET /health`
2. Verify route registration: `npm run verify:apis`
3. Check controller exports match route imports
4. Review server logs for errors

### 404 Errors
1. Verify route path matches exactly
2. Check if route requires authentication
3. Verify HTTP method (GET, POST, etc.)
4. Check route order in server.js

