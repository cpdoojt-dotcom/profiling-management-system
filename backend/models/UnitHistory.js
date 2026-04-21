import mongoose from 'mongoose';

const unitHistorySchema = new mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
    index: true,
  },
  bodyNo: { type: String, required: true, index: true },
  
  // Snapshot of what changed
  changeType: { type: String, enum: ['Creation', 'Update', 'Transfer', 'Status Change'], default: 'Update' },
  summary: { type: String, trim: true },
  reason: { type: String, trim: true },
  
  // Data snapshot before and after
  oldData: { type: Object },
  newData: { type: Object },
  
  // Who did it
  changedBy: { type: String }, // Can be the admin email or ID
  
}, { timestamps: true });

const UnitHistory = mongoose.model('UnitHistory', unitHistorySchema);

export default UnitHistory;
