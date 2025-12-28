# One Place Backend API Documentation

## 🔐 User Hierarchy & Authentication System

### User Roles & Permissions

The system follows a hierarchical user structure where:

1. **Owner** - Can create and manage all other users
2. **Admin** - Can manage products, orders, and users (but not delete orders)
3. **Accountant** - Can manage orders, reports, and companies
4. **Salesman** - Can view products and create orders

### User Creation Flow

```
1. Owner registers first (only one owner allowed)
2. Owner creates other users (admin, accountant, salesman)
3. Owner sends username/password to created users
4. Users login with provided credentials
5. Users can change their password on first login
```

## 📋 API Endpoints

### Authentication Endpoints

#### Register Owner
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Business Owner",
  "email": "owner@company.com",
  "username": "owner",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "Business Owner",
    "email": "owner@company.com",
    "username": "owner",
    "role": "owner",
    "permissions": { ... }
  }
}
```

#### Login (Email or Username)
```http
POST /api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "owner@company.com", // or "owner"
  "password": "securepassword123"
}
```

#### Create User (Owner Only)
```http
POST /api/auth/create-user
Authorization: Bearer <owner_jwt_token>
Content-Type: application/json

{
  "name": "John Salesman",
  "email": "john@company.com",
  "username": "john_sales",
  "password": "temp_password123",
  "role": "salesman",
  "company": "company_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "user_id",
    "name": "John Salesman",
    "email": "john@company.com",
    "username": "john_sales",
    "role": "salesman",
    "company": "company_id",
    "isFirstLogin": true
  }
}
```

#### Get My Users (Owner Only)
```http
GET /api/auth/my-users
Authorization: Bearer <owner_jwt_token>
```

#### Update User Password
```http
PUT /api/auth/update-user-password/:userId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "newPassword": "new_secure_password123"
}
```

### Product Endpoints

#### Get All Products
```http
GET /api/products?page=1&limit=20&category=category_id&brand=brand_id&search=drill
Authorization: Bearer <jwt_token>
```

#### Create Product (Owner/Admin Only)
```http
POST /api/products
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Professional Drill Bit",
  "sku": "DRILL001",
  "brand": "brand_id",
  "category": "category_id",
  "description": "High-quality drill bit",
  "price": 45.99,
  "stock": {
    "current": 50,
    "minimum": 10,
    "maximum": 200
  },
  "vat": {
    "rate": 10,
    "isExempt": false
  }
}
```

### Order Endpoints

#### Create Order
```http
POST /api/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "orderType": "invoice",
  "customer": {
    "company": "company_id",
    "companyName": "Dental Clinic",
    "employee": "Dr. Smith",
    "contactInfo": {
      "name": "Dental Clinic",
      "email": "clinic@email.com",
      "phone": "+97312345678",
      "address": "123 Main St",
      "city": "Manama"
    }
  },
  "items": [
    {
      "product": "product_id",
      "quantity": 2,
      "unitPrice": 45.99,
      "vatRate": 10
    }
  ],
  "payment": {
    "method": "cash"
  },
  "orderStatus": "Normal"
}
```

### Company Endpoints

#### Get All Companies
```http
GET /api/companies?page=1&limit=20&search=dental
Authorization: Bearer <jwt_token>
```

#### Create Company (Owner/Admin Only)
```http
POST /api/companies
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Bright Smile Dental",
  "location": "Manama, Bahrain",
  "contactInfo": {
    "email": "info@brightsmile.com",
    "phone": "+97312345678",
    "address": "123 Business St",
    "city": "Manama",
    "country": "Bahrain"
  },
  "paymentInfo": {
    "creditLimit": 10000,
    "paymentTerms": "credit_30"
  },
  "employees": [
    {
      "name": "Dr. Ahmed",
      "role": "Owner",
      "email": "ahmed@brightsmile.com"
    }
  ]
}
```

## 🔒 Permission System

### Role-Based Permissions

| Resource | Owner | Admin | Accountant | Salesman |
|----------|-------|-------|------------|----------|
| Products | Read/Write/Delete | Read/Write/Delete | Read Only | Read Only |
| Orders | Read/Write/Delete | Read/Write | Read/Write | Read/Write |
| Users | Read/Write/Delete | Read/Write | No Access | No Access |
| Reports | Read/Write | Read/Write | Read/Write | No Access |
| Companies | Read/Write/Delete | Read/Write | Read/Write | Read Only |

### Permission Checking

The system automatically sets permissions based on role, but owners can customize permissions for their users.

## 🏗️ Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  username: String (unique),
  password: String (hashed),
  role: ['owner', 'admin', 'accountant', 'salesman'],
  owner: ObjectId (ref: User), // null for owner
  company: ObjectId (ref: Company),
  isActive: Boolean,
  isFirstLogin: Boolean,
  permissions: {
    products: { read: Boolean, write: Boolean, delete: Boolean },
    orders: { read: Boolean, write: Boolean, delete: Boolean },
    users: { read: Boolean, write: Boolean, delete: Boolean },
    reports: { read: Boolean, write: Boolean },
    companies: { read: Boolean, write: Boolean, delete: Boolean }
  },
  createdBy: ObjectId (ref: User), // null for owner
  profile: {
    phone: String,
    address: String,
    city: String,
    avatar: String
  }
}
```

## 🚀 Getting Started

### 1. Register Owner
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Owner",
    "email": "owner@company.com",
    "username": "owner",
    "password": "owner123"
  }'
```

### 2. Login as Owner
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "owner@company.com",
    "password": "owner123"
  }'
```

### 3. Create Users
```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Salesman",
    "email": "john@company.com",
    "username": "john_sales",
    "password": "temp123",
    "role": "salesman"
  }'
```

### 4. Login as Created User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "john_sales",
    "password": "temp123"
  }'
```

## 🔧 Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oneplace
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

## 📊 Sample Data

The system includes seed data with:
- 1 Owner user
- 1 Admin user
- 1 Accountant user
- 1 Salesman user
- 5 Companies
- 12 Categories
- 10 Brands
- 20 Products

Run `npm run seed` to populate the database with sample data.

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers

## 📝 Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

## 🔄 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
