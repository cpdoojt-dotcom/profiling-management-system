import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  licenseNo: { type: String, required: true, unique: true },
  toda: { type: String, required: true },
  plateNo: { type: String, required: true },
  contactNo: { type: String },
  address: { type: String },
  status: { type: String, default: 'Active' },
}, { timestamps: true });

const Driver = mongoose.model('Driver', driverSchema);

export default Driver;
