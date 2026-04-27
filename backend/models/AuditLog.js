import mongoose from 'mongoose';

const fieldChangeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    before: { type: String, default: '' },
    after: { type: String, default: '' },
  },
  { _id: false },
);

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: 'system@local' },
    actorRole: { type: String, default: 'system' },
    action: {
      type: String,
      enum: ['Create', 'Update', 'Delete'],
      required: true,
    },
    module: {
      type: String,
      enum: ['Driver', 'Conductor', 'Unit', 'Operator'],
      required: true,
    },
    entityId: { type: String, required: true },
    summary: { type: String, required: true },
    changes: { type: [fieldChangeSchema], default: [] },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorEmail: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
