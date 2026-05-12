import express from 'express';
import mongoose from 'mongoose';
import dns from 'dns';

// Fix for local network resolution errors
dns.setServers(['8.8.8.8', '8.8.4.4']);
import cors from 'cors';
import dotenv from 'dotenv';
import driverRoutes from './routes/driverRoutes.js';
import authRoutes from './routes/authRoutes.js';
import operatorRoutes from './routes/operatorRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
import conductorRoutes from './routes/conductorRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/drivers', driverRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/conductors', conductorRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'profiling_system_db' // Assuming default DB name, can be adjusted
    });
    console.log('Connected to MongoDB Atlas successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

connectDB();
