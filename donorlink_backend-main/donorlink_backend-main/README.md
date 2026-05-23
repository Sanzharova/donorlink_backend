# DonorLink Backend

A blood donation management system REST API built with Express.js and MongoDB. Designed to connect blood donors with blood centers, manage donation schedules, and provide admin controls for system management.

## Table of Contents

- [Overview](#overview)
- [ER Diagram](#er-diagram)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Middleware](#middleware)
- [Constants](#constants)
- [Development](#development)

## Overview

DonorLink Backend provides a comprehensive REST API for managing blood donations. It supports:

- **User Management**: Registration, authentication, profile management with role-based access (user/admin)
- **Donation Management**: Create, track, and update donation records with status workflow
- **Blood Center Management**: Manage blood center locations, operating hours, and donor capacity
- **Authentication & Authorization**: JWT-based authentication with refresh token support and role-based access control
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

## ER Diagram

![DonorLink er diagram](https://i.postimg.cc/MpKBz1yd/er-diagram.png)

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose 8.20.1
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Security**: bcrypt 6.0.0 for password hashing
- **Documentation**: Swagger/OpenAPI with swagger-jsdoc and swagger-ui-express
- **Development**: nodemon for hot reloading
- **Utilities**: cors, cookie-parser, dotenv

## Project Structure

```
donorlink_backend/
├── models/                 # MongoDB schemas
│   ├── User.js            # User model with donor profile fields
│   ├── Donation.js        # Donation records
│   └── BloodCenter.js     # Blood center locations & info
├── routes/                # API route handlers
│   ├── auth.js           # Authentication endpoints
│   ├── users.js          # User CRUD operations
│   ├── donations.js      # Donation CRUD operations
│   └── bloodcenter.js    # Blood center management
├── middleware/           # Express middleware
│   ├── Auth.js           # JWT verification
│   ├── Permit.js         # Role-based access control
│   ├── VerifyRefreshToken.js  # Refresh token validation
│   └── CheckNotBanned.js # Ban status verification
├── index.js              # Application entry point
├── config.js             # Configuration settings
├── constants.js          # Application constants
├── swagger.js            # Swagger/OpenAPI setup
├── fixtures.js           # Database seeding script
├── package.json          # Dependencies and scripts
└── .env                  # Environment variables (not in repo)
```

## Installation

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd donorlink_backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env` file** in the root directory (see [Environment Variables](#environment-variables))

4. **Verify MongoDB connection**
   ```bash
   # Ensure MongoDB is running locally or remote instance is accessible
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=8000

# Database
MONGO_DB_URL=mongodb://127.0.0.1:27017/donorlink

# JWT Secrets (generate secure random strings)
JWT_ACCESS=your_access_token_secret_here
JWT_REFRESH=your_refresh_token_secret_here

# CORS
ALLOWED_ORIGIN=http://localhost:3000
```

### JWT Token Generation

To generate secure JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Running the Application

### Development Mode (with hot reload)

```bash
npm run dev
```

Server runs on `http://localhost:8000` by default.

### Production Mode

```bash
npm start
```

### Seed Database with Test Data

```bash
npm run seed
```

Populates MongoDB with sample users and blood centers.

## API Documentation

### Interactive Swagger UI

Once the server is running, access the interactive API documentation:

```
http://localhost:8000/api-docs
```

Features:

- Browse all available endpoints
- Try endpoints directly in the browser
- View request/response schemas
- See authentication requirements

## Authentication

### Overview

The API uses **JWT (JSON Web Tokens)** for authentication:

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (30 days), stored in httpOnly cookies for token renewal

### Token Flow

1. **Register/Login**: User receives access token and refresh token (in cookie)
2. **API Requests**: Include access token in `Authorization` header: `Bearer <token>`
3. **Token Expiry**: When access token expires, use refresh endpoint to get new tokens
4. **Logout**: Clear refresh token cookie

### Request Headers

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint    | Auth          | Description          |
| ------ | ----------- | ------------- | -------------------- |
| POST   | `/register` | -             | Register new user    |
| POST   | `/login`    | -             | Login user           |
| POST   | `/refresh`  | Refresh Token | Get new access token |
| POST   | `/logout`   | Refresh Token | Logout user          |

### Users (`/api/users`)

| Method | Endpoint | Auth | Role  | Description                   |
| ------ | -------- | ---- | ----- | ----------------------------- |
| GET    | `/`      | ✓    | admin | Get all users with pagination |
| GET    | `/:id`   | ✓    | admin | Get user by ID                |
| PUT    | `/:id`   | ✓    | admin | Update user                   |
| DELETE | `/:id`   | ✓    | admin | Delete user                   |

### Donations (`/api/donations`)

| Method | Endpoint        | Auth | Role  | Description                                        |
| ------ | --------------- | ---- | ----- | -------------------------------------------------- |
| POST   | `/`             | ✓    | -     | Create donation (auto-assigns to logged-in user)   |
| GET    | `/`             | ✓    | admin | Get all donations with pagination                  |
| GET    | `/my-donations` | ✓    | -     | Get user's own donations                           |
| GET    | `/:id`          | ✓    | -     | Get donation by ID (users see own, admins see all) |
| PUT    | `/:id`          | ✓    | admin | Update donation status                             |

### Blood Centers (`/api/blood-centers`)

| Method | Endpoint       | Auth | Role  | Description                           |
| ------ | -------------- | ---- | ----- | ------------------------------------- |
| POST   | `/`            | ✓    | admin | Create blood center                   |
| GET    | `/`            | ✓    | admin | Get all blood centers with pagination |
| GET    | `/:id`         | ✓    | admin | Get blood center by ID                |
| PUT    | `/:id`         | ✓    | admin | Update blood center details           |
| PATCH  | `/:id/archive` | ✓    | admin | Archive blood center                  |

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, min 5 chars),
  roles: [String] (enum: ['user', 'admin'], default: ['user']),
  fullName: String (required),
  phone: String (required),
  gender: String (enum: ['male', 'female']),
  dateOfBirth: Date,
  bloodType: String (enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  status: String (enum: ['active', 'inactive', 'banned'], default: 'active'),
  medicalHistory: String (optional),
  donationCount: Number (default: 0),
  lastDonationDate: Date (optional),
  address: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Donation Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  status: String (enum: ['requested', 'confirmed', 'completed', 'canceled'], default: 'requested'),
  scheduledFor: Date (required),
  completedAt: Date (auto-set when status = 'completed'),
  centerId: ObjectId (ref: BloodCenter, required),
  notes: String (max 1000 chars),
  createdAt: Date,
  updatedAt: Date
}
```

### BloodCenter Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  address: String (required),
  phone: String (required),
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    // ... other days
  },
  currentDonorCount: Number (default: 0),
  archived: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

## Middleware

### Auth.js

Verifies JWT access token and attaches user to request.

- Checks `Authorization` header for Bearer token
- Validates token signature and expiry
- Blocks banned users
- Returns 401 if invalid/missing token

### Permit.js

Role-based access control middleware.

```javascript
router.get('/', auth, permit(['admin']), handler);
```

- Validates user has required role(s)
- Returns 403 if unauthorized

### VerifyRefreshToken.js

Validates refresh token from cookies for token renewal.

- Checks httpOnly refresh token cookie
- Validates token and user existence
- Used for `/api/auth/refresh` and `/api/auth/logout`

### CheckNotBanned.js

Prevents banned users from performing certain actions.

- Checks if user status is 'banned'
- Returns 403 if banned
- Used on donation creation and sensitive operations

## Constants

Defined in `constants.js`:

```javascript
DONATION_STATUS: ['requested', 'confirmed', 'completed', 'canceled'];
BLOOD_TYPES: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
USER_ROLES: ['user', 'admin'];
USER_STATUS: ['active', 'inactive', 'banned'];
```

## Development

### NPM Scripts

```bash
npm start           # Production: run with node
npm run dev        # Development: run with nodemon (hot reload)
npm run seed       # Populate database with test data
npm test           # Run tests (not yet configured)
```

### Code Style

- ES Modules syntax
- Async/await for async operations
- Error handling with try/catch in routes
- Consistent naming conventions

### Testing Endpoints Locally

Using curl or Postman:

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"mypass123","fullName":"John Doe","phone":"+996555123123","gender":"male","dateOfBirth":"1995-05-12","bloodType":"A+","address":"Bishkek"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"mypass123"}'

# Get user donations (with access token)
curl -X GET http://localhost:8000/api/donations/my-donations \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Debugging

Enable detailed logging by setting `DEBUG` environment variable:

```bash
DEBUG=* npm run dev
```

Monitor MongoDB queries:

```bash
MONGOOSE_DEBUG=true npm run dev
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Resource created
- **400**: Bad request (validation error)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **422**: Unprocessable entity (validation error)
- **500**: Server error

## License

ISC

## Support

For issues or questions, please create an issue in the repository.
