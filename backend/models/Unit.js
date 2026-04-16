import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    required: true,
    index: true,
  },
  bodyNo: { type: String, required: true, trim: true },
  colorCode: { type: String, trim: true },
  makeType: { type: String, trim: true },
  chassisNo: { type: String, trim: true },
  motorNo: { type: String, trim: true },
  plateNo: { type: String, trim: true },
  yearModel: { type: String, trim: true },
}, { timestamps: true });

unitSchema.index({ operator: 1, bodyNo: 1 }, { unique: true });

const Unit = mongoose.model('Unit', unitSchema);

export default Unit;
