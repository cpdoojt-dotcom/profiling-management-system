# Profiling Management System

A comprehensive web-based system for managing transportation profiles, including drivers, operators, conductors, and vehicle units. Built with a modern full-stack architecture.

## Features

- **User Management**: Role-based authentication (Admin, OTMPS) with JWT tokens
- **Driver Profiling**: Complete driver information management with photo uploads
- **Operator Management**: Operator registration and profile management
- **Conductor Tracking**: Conductor profiles and assignment tracking
- **Unit Management**: Vehicle unit tracking with history
- **Audit Logging**: Comprehensive activity logging for accountability
- **Image Upload**: Cloudinary integration for profile photos
- **Excel Export**: Data export capabilities for reporting
- **Responsive UI**: Modern React-based interface with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Cloudinary** for image storage
- **multer** for file uploads
- **cors** for cross-origin requests

### Frontend
- **React 19** with Vite
- **React Router DOM** for navigation
- **Axios** for API requests
- **Lucide React** for icons
- **ExcelJS** & **XLSX** for Excel operations
- **Context API** for state management

## Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- Cloudinary account
- npm or yarn package manager

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd profiling-management-system
```

### 2. Install root dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
npm install
```

### 4. Install frontend dependencies
```bash
cd ../frontend
npm install
```

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
JWT_SECRET=<your-secret-key>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

**Note**: Replace the placeholder values with your actual credentials.

## Running the Application

### Start the Backend Server
```bash
cd backend
npm run dev
```
The backend will run on `http://localhost:5000`

### Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173` (or another port as assigned by Vite)

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd ../backend
npm start
```

## Project Structure

```
profiling-management-system/
├── backend/
│   ├── config/
│   │   └── cloudinary.js          # Cloudinary configuration
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT authentication middleware
│   ├── models/
│   │   ├── AuditLog.js            # Audit log model
│   │   ├── Conductor.js           # Conductor model
│   │   ├── Driver.js              # Driver model
│   │   ├── Operator.js            # Operator model
│   │   ├── Unit.js                # Vehicle unit model
│   │   ├── UnitHistory.js         # Unit history model
│   │   └── User.js                # User authentication model
│   ├── routes/
│   │   ├── auditLogRoutes.js      # Audit log endpoints
│   │   ├── authRoutes.js          # Authentication endpoints
│   │   ├── conductorRoutes.js     # Conductor CRUD endpoints
│   │   ├── driverRoutes.js        # Driver CRUD endpoints
│   │   ├── operatorRoutes.js      # Operator CRUD endpoints
│   │   └── unitRoutes.js          # Unit CRUD endpoints
│   ├── .env                       # Environment variables
│   ├── package.json
│   └── server.js                  # Express server entry point
├── frontend/
│   ├── public/                    # Static assets
│   ├── src/
│   │   ├── components/            # Reusable React components
│   │   ├── context/               # React context providers
│   │   ├── pages/                 # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DriversList.jsx
│   │   │   ├── DriverForm.jsx
│   │   │   ├── OperatorsPage.jsx
│   │   │   ├── OperatorForm.jsx
│   │   │   ├── ConductorList.jsx
│   │   │   ├── ConductorForm.jsx
│   │   │   ├── UnitHistory.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   └── Login.jsx
│   │   ├── utils/                # Utility functions
│   │   ├── App.jsx                # Main app component
│   │   └── main.jsx               # React entry point
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Drivers (Protected)
- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/:id` - Get driver by ID
- `POST /api/drivers` - Create new driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Operators (Protected)
- `GET /api/operators` - Get all operators
- `GET /api/operators/:id` - Get operator by ID
- `POST /api/operators` - Create new operator
- `PUT /api/operators/:id` - Update operator
- `DELETE /api/operators/:id` - Delete operator

### Conductors (Protected)
- `GET /api/conductors` - Get all conductors
- `GET /api/conductors/:id` - Get conductor by ID
- `POST /api/conductors` - Create new conductor
- `PUT /api/conductors/:id` - Update conductor
- `DELETE /api/conductors/:id` - Delete conductor

### Units (Protected)
- `GET /api/units` - Get all units
- `GET /api/units/:id` - Get unit by ID
- `POST /api/units` - Create new unit
- `PUT /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Delete unit

### Audit Logs (Protected - Admin only)
- `GET /api/audit-logs` - Get all audit logs

## User Roles & Permissions

### Admin
- Full access to all features
- Can create, edit, and delete drivers, operators, conductors, and units
- Can view audit logs
- Can manage user accounts

### OTMPS
- View-only access to drivers, operators, conductors, and units
- Cannot access audit logs
- Cannot create or modify records

## Data Models

### Driver
- Personal information (name, address, contact details)
- License information (number, expiry date)
- CPDO ID
- Operator and Unit associations
- Driver type (Tricycle, Jeepney, Mini Bus)
- Profile photo
- Status (Active/Inactive)

### Operator
- Business information
- Contact details
- Associated drivers and units

### Conductor
- Personal information
- Assignment details
- Associated unit

### Unit
- Vehicle information
- Plate number
- Type and classification
- Assignment history

## Development Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Security Considerations

- All API endpoints (except auth) are protected with JWT authentication
- Passwords are hashed using bcryptjs before storage
- Role-based access control ensures proper authorization
- CORS is configured for cross-origin requests
- Environment variables should never be committed to version control

## Troubleshooting

### MongoDB Connection Issues
- Ensure your MongoDB Atlas IP whitelist includes your current IP
- Verify connection string format in `.env` file
- Check network connectivity

### Cloudinary Upload Issues
- Verify Cloudinary API credentials
- Ensure upload limits are not exceeded
- Check file size and format restrictions

### Frontend Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`
- Ensure Node.js version is compatible

## License

ISC

## Support

For issues and questions, please contact the development team.