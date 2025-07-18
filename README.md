# EastVille Backend API

A robust Node.js/Express.js backend API for the EastVille Villa Management System. This API provides comprehensive functionality for managing villa clusters, user authentication, and contact inquiries.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Villa Management**: CRUD operations for villa clusters with advanced search and filtering
- **Contact Management**: Comprehensive contact inquiry system with admin dashboard
- **Security**: Rate limiting, CORS, Helmet security headers, input validation
- **Logging**: Structured logging with Winston
- **Error Handling**: Centralized error handling with detailed error responses
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Request validation using express-validator

## 📋 Prerequisites

- Node.js (>= 18.0.0)
- MongoDB (>= 4.0.0)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eastVilleBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/villasDB
   JWT_SECRET=your_super_secret_jwt_key_here
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Project Structure

```
eastVilleBackend/
├── src/
│   ├── config/
│   │   ├── config.js          # Application configuration
│   │   └── database.js        # Database connection setup
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   ├── clusterController.js # Villa cluster management
│   │   └── contactController.js # Contact inquiry management
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   ├── validation.js     # Request validation middleware
│   │   └── errorHandler.js   # Error handling middleware
│   ├── models/
│   │   ├── User.js           # User model
│   │   ├── Cluster.js        # Cluster and Villa models
│   │   └── Contact.js        # Contact model
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── clusters.js       # Cluster management routes
│   │   └── contacts.js       # Contact management routes
│   ├── utils/
│   │   └── logger.js         # Winston logger configuration
│   └── server.js             # Main application file
├── logs/                     # Application logs
├── package.json
├── env.example
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

### Clusters
- `GET /api/clusters` - Get all clusters (with pagination & filtering)
- `GET /api/clusters/stats` - Get cluster statistics
- `GET /api/clusters/clusterId/:clusterId` - Get specific cluster
- `GET /api/clusters/villa/search/:combinedId` - Search villa by combined ID
- `POST /api/clusters` - Create new cluster (admin only)
- `PUT /api/clusters/:clusterId` - Update cluster (admin only)
- `DELETE /api/clusters/:clusterId` - Delete cluster (admin only)

### Contacts
- `POST /api/contacts` - Create contact inquiry
- `GET /api/contacts` - Get all contacts (admin only, with pagination & filtering)
- `GET /api/contacts/stats` - Get contact statistics (admin only)
- `GET /api/contacts/export` - Export contacts (admin only)
- `GET /api/contacts/:id` - Get specific contact (admin only)
- `PUT /api/contacts/:id` - Update contact (admin only)
- `DELETE /api/contacts/:id` - Delete contact (admin only)
- `PUT /api/contacts/bulk/update` - Bulk update contacts (admin only)

### System
- `GET /health` - Health check endpoint
- `GET /api` - API information

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in requests:

**Cookie-based (recommended):**
```javascript
// Token is automatically sent with cookies
fetch('/api/auth/profile', {
  credentials: 'include'
})
```

**Header-based:**
```javascript
fetch('/api/auth/profile', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})
```

## 📊 Database Models

### User
- `username` (String, required, unique)
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `role` (String, enum: ['user', 'admin'], default: 'user')
- `isActive` (Boolean, default: true)
- `lastLogin` (Date)

### Cluster
- `clusterName` (String, required)
- `clusterId` (String, required, unique)
- `villas` (Array of Villa subdocuments)
- `x`, `y` (Number, coordinates)
- `description` (String)
- `amenities` (Array of Strings)
- `isActive` (Boolean, default: true)

### Villa (Subdocument)
- `id` (String, required)
- `status` (String, enum: ['Available', 'Sold', 'Under Construction'])
- `size` (Number, required)
- `type` (String, required)
- `price` (Number)
- `bedrooms`, `bathrooms` (Number)
- `description` (String)
- `features`, `images` (Array of Strings)

### Contact
- `name`, `email`, `phone` (String, required)
- `interestedUnit`, `message` (String)
- `status` (String, enum: ['Pending', 'In Progress', 'Resolved', 'Cancelled'])
- `priority` (String, enum: ['Low', 'Medium', 'High', 'Urgent'])
- `source` (String, enum: ['Website', 'Phone', 'Email', 'Walk-in', 'Referral'])
- `salesComment` (String)
- `updatedBy` (Object with user info)
- `tags` (Array of Strings)

## 🛡️ Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Input Validation**: Request data validation
- **JWT Security**: Secure token handling
- **Password Hashing**: bcrypt for password security
- **Error Handling**: No sensitive data in error responses

## 📝 Scripts

```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm test            # Run tests
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run format      # Format code with Prettier
```

## 🔧 Configuration

Key configuration options in `src/config/config.js`:

- **Server**: Port, environment
- **Database**: MongoDB connection URI
- **JWT**: Secret key, expiration time
- **CORS**: Allowed origins
- **Rate Limiting**: Window size and request limits
- **Logging**: Log level and file paths

## 📈 Monitoring & Logging

The application uses Winston for structured logging:

- **Log Levels**: error, warn, info, debug
- **Log Files**: `logs/error.log`, `logs/combined.log`
- **Console Output**: In development mode
- **Request Logging**: All API requests are logged

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   PORT=5001
   MONGODB_URI=your_production_mongodb_uri
   JWT_SECRET=your_production_jwt_secret
   ```

2. **Install Dependencies**
   ```bash
   npm ci --only=production
   ```

3. **Start Application**
   ```bash
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository. 