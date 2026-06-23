import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createOtmps = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const otmpsEmail = 'OTMPS.user@gmail.com';
    const otmpsPassword = 'Otmps@Secure2026';

    const existingUser = await User.findOne({ email: otmpsEmail });
    if (existingUser) {
      console.log('OTMPS user already exists');
      console.log('Email: ' + otmpsEmail);
      console.log('Password: ' + otmpsPassword);
    } else {
      await User.create({
        email: otmpsEmail,
        password: otmpsPassword,
        role: 'otmps',
      });
      console.log('OTMPS user created successfully!');
      console.log('Email: ' + otmpsEmail);
      console.log('Password: ' + otmpsPassword);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating OTMPS user:', error);
    process.exit(1);
  }
};

createOtmps();
