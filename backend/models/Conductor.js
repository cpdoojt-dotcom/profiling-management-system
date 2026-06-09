import mongoose from 'mongoose';

const conductorSchema = new mongoose.Schema({
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
  },
  lastName: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  extensionName: { type: String, trim: true },
  civilStatus: { type: String, trim: true },
  gender: { type: String, trim: true },
  addressNo: { type: String, trim: true },
  street: { type: String, trim: true },
  purok: { type: String, trim: true },
  barangay: { type: String, trim: true },
  cityMunicipality: { type: String, trim: true },
  contactNo: { type: String, trim: true },
  age: { type: Number, min: 0 },
  birthMonth: { type: String, trim: true },
  birthDate: { type: Number, min: 1, max: 31 },
  birthYear: { type: Number, min: 1900, max: 2100 },
  birthPlace: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },
  emergencyContactNo: { type: String, trim: true },
  emergencyContactAddress: { type: String, trim: true },
  photoUrl: { type: String, trim: true },
  status: { type: String, default: 'Active' },
}, { timestamps: true });

// Indexes for performance
conductorSchema.index({ lastName: 1, firstName: 1 });

const Conductor = mongoose.model('Conductor', conductorSchema);

export default Conductor;
