import mongoose from 'mongoose';

const operatorSchema = new mongoose.Schema({
  lastName: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  civilStatus: { type: String, trim: true },
  birthdate: { type: Date },
  birthplace: { type: String, trim: true },
  age: { type: Number, min: 0 },
  addressNo: { type: String, trim: true },
  street: { type: String, trim: true },
  purok: { type: String, trim: true },
  barangay: { type: String, trim: true },
  cityMunicipality: { type: String, trim: true },
  contactNo: { type: String, trim: true },
  ltfrbMchCaseNo: { type: String, trim: true },
  operatorType: { 
    type: String, 
    enum: ['Tricycle', 'Jeepney', 'Mini Bus'],
    required: true,
    default: 'Tricycle'
  },
}, { timestamps: true });

const Operator = mongoose.model('Operator', operatorSchema);

export default Operator;
