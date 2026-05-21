import jwt from 'jsonwebtoken';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

const EXCLUDED_FIELDS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'driverHistory']);

const toComparableString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  // Normalize Mongoose ObjectId instances and populated refs to the same stable ID
  // so unchanged relationships are not flagged as modified.
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }

  if (typeof value === 'object') {
    if (value._id) {
      return String(value._id);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const toDisplayString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }

  if (typeof value === 'object' && value._id) {
    const middle = value.middleName || value.middleInitial || value.middle || '';
    const parts = [value.firstName, middle, value.lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean);
    const fullName = parts.join(' ');
    
    // If it has a bodyNo (it's a unit), return that
    if (value.bodyNo) {
      return `Body #${value.bodyNo} ${value.plateNo ? `(${value.plateNo})` : ''}`.trim();
    }
    
    return fullName || String(value._id);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const normalizeDoc = (doc) => {
  if (!doc) return {};
  if (typeof doc.toObject === 'function') return doc.toObject();
  return doc;
};

const buildChanges = (beforeDoc, afterDoc) => {
  const before = normalizeDoc(beforeDoc);
  const after = normalizeDoc(afterDoc);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return Array.from(keys)
    .filter((field) => !EXCLUDED_FIELDS.has(field))
    .map((field) => {
      const beforeComparable = toComparableString(before[field]);
      const afterComparable = toComparableString(after[field]);
      return {
        field,
        before: toDisplayString(before[field]),
        after: toDisplayString(after[field]),
        changed: beforeComparable !== afterComparable,
      };
    })
    .filter((entry) => entry.changed)
    .map(({ changed, ...entry }) => entry);
};

const extractBearerToken = (authorizationHeader = '') => {
  if (!authorizationHeader.startsWith('Bearer ')) return null;
  return authorizationHeader.slice('Bearer '.length).trim();
};

const getActorFromRequest = async (req) => {
  if (req.user) {
    return {
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
    };
  }

  const fallbackActor = {
    actorId: null,
    actorEmail: 'system@local',
    actorRole: 'system',
  };

  const token = extractBearerToken(req.headers.authorization || '');
  if (!token) return fallbackActor;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('email role');
    if (!user) {
      return {
        actorId: payload.id || null,
        actorEmail: 'unknown@local',
        actorRole: payload.role || 'staff',
      };
    }
    return {
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
    };
  } catch {
    return fallbackActor;
  }
};

export const createAuditLog = async ({
  req,
  action,
  module,
  entityId,
  summary,
  before = null,
  after = null,
}) => {
  try {
    const actor = await getActorFromRequest(req);
    const changes = buildChanges(before, after);
    if (action === 'Update' && changes.length === 0) {
      return;
    }

    await AuditLog.create({
      ...actor,
      action,
      module,
      entityId: String(entityId),
      summary,
      changes,
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
};
