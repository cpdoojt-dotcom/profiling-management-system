import mongoose from 'mongoose';

const operatorSchema = new mongoose.Schema({
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
  operatorType: { 
    type: String, 
    enum: ['FOR HIRE', 'Tricycle', 'Jeepney', 'Mini Bus'],
    required: true,
    default: 'FOR HIRE'
  },
  photoUrl: { type: String, trim: true },
  transferStatus: {
    type: String,
    enum: ['None', 'Transferred'],
    default: 'None'
  },
}, { timestamps: true });

// Indexes for performance
operatorSchema.index({ lastName: 1, firstName: 1 });

const Operator = mongoose.model('Operator', operatorSchema);

export default Operator;
