import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    required: true,
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
  },
  cpdoId: { type: String, required: true, unique: true, trim: true },
  licenseNo: { type: String, required: true, unique: true, trim: true },
  licenseExpiryDate: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  extensionName: { type: String, trim: true },
  civilStatus: { type: String, trim: true },
  age: { type: Number, min: 0 },
  addressNo: { type: String, trim: true },
  street: { type: String, trim: true },
  purok: { type: String, trim: true },
  barangay: { type: String, trim: true },
  cityMunicipality: { type: String, trim: true },
  contactNo: { type: String, trim: true },
  birthMonth: { type: String, trim: true },
  birthDate: { type: Number, min: 1, max: 31 },
  birthYear: { type: Number, min: 1900, max: 2100 },
  birthplace: { type: String, trim: true },
  photoUrl: { type: String, trim: true },
  conductorName: { type: String, trim: true },
  status: { type: String, default: 'Active' },
  driverType: { 
    type: String, 
    enum: ['Tricycle', 'Jeepney', 'Mini Bus'],
    required: true,
    default: 'Tricycle'
  },
}, { timestamps: true });

const Driver = mongoose.model('Driver', driverSchema);

export default Driver;
