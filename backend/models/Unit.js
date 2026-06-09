import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    required: true,
    index: true,
  },
  vehicleType: { 
    type: String, 
    enum: ['Tricycle', 'Jeepney', 'Mini Bus'], 
    required: true 
  },
  bodyNo: { type: String, required: true, trim: true },
  colorCode: { type: String, trim: true },
  makeType: { type: String, trim: true },
  chassisNo: { type: String, trim: true },
  motorNo: { type: String, trim: true },
  plateNo: { type: String, trim: true },
  yearModel: { type: String, trim: true },
  zone: { type: String, trim: true }, // Primarily for Tricycles
  ltfrbMchCaseNo: { type: String, trim: true },
  conductor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conductor',
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },
  driverHistory: [{
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    startDate: { type: Date },
    endDate: { type: Date }
  }]
}, { timestamps: true });

// Indexes for performance
unitSchema.index({ operator: 1, bodyNo: 1 }, { unique: true });
unitSchema.index({ bodyNo: 1 });
unitSchema.index({ plateNo: 1 });

const Unit = mongoose.model('Unit', unitSchema);

export default Unit;
