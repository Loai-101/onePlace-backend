# One Place Backend API

A comprehensive backend API for the One Place Dental Supply Management System built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Product Management**: Complete CRUD operations for products, categories, and brands
- **Order Management**: Full order lifecycle management with status tracking
- **Company Management**: Customer/company management with payment tracking
- **User Management**: Multi-role user system (Owner, Admin, Accountant, Salesman)
- **Inventory Management**: Stock tracking with low-stock alerts
- **Sales Analytics**: Order statistics and reporting
- **File Upload**: Support for product images and documents
- **Data Validation**: Comprehensive input validation and sanitization
- **Security**: Rate limiting, CORS, helmet security headers

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer
- **Environment**: dotenv

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd onePlace-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update the environment variables:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oneplace
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:5173
   ```

4. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Owner/Admin)
- `PUT /api/products/:id` - Update product (Owner/Admin)
- `DELETE /api/products/:id` - Delete product (Owner/Admin)
- `PATCH /api/products/:id/stock` - Update stock (Owner/Admin)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/tree` - Get category tree
- `GET /api/categories/:id` - Get single category
- `GET /api/categories/:id/products` - Get category products
- `POST /api/categories` - Create category (Owner/Admin)
- `PUT /api/categories/:id` - Update category (Owner/Admin)
- `DELETE /api/categories/:id` - Delete category (Owner/Admin)

### Brands
- `GET /api/brands` - Get all brands
- `GET /api/brands/featured` - Get featured brands
- `GET /api/brands/with-counts` - Get brands with product counts
- `GET /api/brands/:id` - Get single brand
- `GET /api/brands/:id/products` - Get brand products
- `POST /api/brands` - Create brand (Owner/Admin)
- `PUT /api/brands/:id` - Update brand (Owner/Admin)
- `DELETE /api/brands/:id` - Delete brand (Owner/Admin)

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/statistics` - Get order statistics
- `GET /api/orders/company/:companyId` - Get company orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order (Owner/Admin)

### Companies
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get single company
- `GET /api/companies/:id/sales-history` - Get company sales history
- `POST /api/companies` - Create company (Owner/Admin)
- `PUT /api/companies/:id` - Update company (Owner/Admin)
- `DELETE /api/companies/:id` - Delete company (Owner/Admin)
- `PATCH /api/companies/:id/payment` - Update payment info

### Users
- `GET /api/users` - Get all users (Owner/Admin)
- `GET /api/users/statistics` - Get user statistics (Owner/Admin)
- `GET /api/users/company/:companyId` - Get company users
- `GET /api/users/:id` - Get single user (Owner/Admin)
- `POST /api/users` - Create user (Owner/Admin)
- `PUT /api/users/:id` - Update user (Owner/Admin)
- `DELETE /api/users/:id` - Delete user (Owner/Admin)

### Clinics
- `GET /api/clinics` - Get all clinics
- `GET /api/clinics/statistics` - Get clinic statistics
- `GET /api/clinics/:id` - Get single clinic
- `POST /api/clinics` - Create clinic (Owner/Admin)
- `PUT /api/clinics/:id` - Update clinic (Owner/Admin)
- `DELETE /api/clinics/:id` - Delete clinic (Owner/Admin)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 User Roles

- **Admin**: Full system access
- **Owner**: Business management access
- **Accountant**: Financial and order management
- **Salesman**: Product and order access

## 📊 Database Models

### User
- Personal information and authentication
- Role-based permissions
- Company association

### Company
- Customer/clinic information
- Payment terms and credit limits
- Employee management
- Sales history tracking

### Product
- Product details and specifications
- Inventory management
- Pricing and VAT information
- Category and brand associations

### Order
- Complete order information
- Customer and payment details
- Order items with pricing
- Status tracking

### Category
- Hierarchical category structure
- Product organization
- SEO metadata

### Brand
- Brand information and contact details
- Product associations
- Featured brand support

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention (MongoDB)

## 📈 Performance

- Database indexing for optimal queries
- Pagination for large datasets
- Compression middleware
- Efficient aggregation pipelines
- Connection pooling

## 🚀 Deployment

1. Set production environment variables
2. Build the application
3. Start with PM2 or similar process manager
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
6. Configure monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**One Place Backend API** - Powering the future of dental supply management 🦷✨
