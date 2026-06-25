const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const updateAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'dolopatubogmail.com';
    const password = '*kulot1967';
    const role = 'admin';

    const existingUser = await mongoose.connection.db.collection('users').findOne({ email });
    
    if (existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await mongoose.connection.db.collection('users').updateOne(
        { email },
        { $set: { password: hashedPassword, role: role } }
      );
      console.log('User updated successfully!');
      console.log('Email: ' + email);
      console.log('Password: ' + password);
      console.log('Role: ' + role);
    } else {
      console.log('User not found with email: ' + email);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
};

updateAdminUser();
