import mongoose from 'mongoose';

const operatorSchema = new mongoose.Schema({
  bodyNo: { type: String, required: true, unique: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  civilStatus: { type: String, trim: true },
  age: { type: Number, min: 0 },
  addressNo: { type: String, trim: true },
  street: { type: String, trim: true },
  purok: { type: String, trim: true },
  barangay: { type: String, trim: true },
  cityMunicipality: { type: String, trim: true },
  contactNo: { type: String, trim: true },
  ltfrbMchCaseNo: { type: String, trim: true },
  colorCode: { type: String, trim: true },
  makeType: { type: String, trim: true },
  chassisNo: { type: String, trim: true },
  motorNo: { type: String, trim: true },
  plateNo: { type: String, trim: true },
  yearModel: { type: String, trim: true },
}, { timestamps: true });

const Operator = mongoose.model('Operator', operatorSchema);

export default Operator;
