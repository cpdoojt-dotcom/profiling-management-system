import express from 'express';
import multer from 'multer';
import Conductor from '../models/Conductor.js';
import Operator from '../models/Operator.js';
import Unit from '../models/Unit.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const getFullName = (person) => {
  if (!person) return '';
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const parsePayload = (body) => {
  if (!body.conductor) {
    return typeof body === 'string' ? JSON.parse(body) : body;
  }
  return typeof body.conductor === 'string' ? JSON.parse(body.conductor) : body.conductor;
};

// Get all conductors
router.get('/', async (req, res) => {
  try {
    const conductors = await Conductor.find()
      .populate('operator')
      .populate('unit')
      .sort({ createdAt: -1 });
    res.json(conductors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new conductor
router.post('/', upload.single('conductorImage'), async (req, res) => {
  try {
    const conductorData = parsePayload(req.body);
    if (!conductorData || Object.keys(conductorData).length === 0) {
      return res.status(400).json({ message: 'Conductor data is required.' });
    }

    const operatorId = conductorData.operator;
    const unitId = conductorData.unit;

    if (!operatorId || !unitId) {
      return res.status(400).json({ message: 'Please select an operator and unit for this conductor.' });
    }

    const unit = await Unit.findById(unitId);
    if (!unit || String(unit.operator) !== String(operatorId)) {
      return res.status(400).json({ message: 'Selected unit does not belong to the selected operator.' });
    }

    // STRICT CHECK: Conductor can only be assigned to Mini Bus
    if (unit.vehicleType !== 'Mini Bus') {
      return res.status(400).json({ message: 'Conductors can only be assigned to Mini Bus units.' });
    }

    const nextConductorData = { ...conductorData };
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      nextConductorData.photoUrl = uploadResult.secure_url;
    }

    const conductor = new Conductor({
      ...conductorData,
      ...nextConductorData,
      operator: operatorId,
      unit: unitId,
    });
    const newConductor = await conductor.save();

    // AUTO-SYNC: Update the Unit profile to reflect this new conductor
    await Unit.findByIdAndUpdate(unitId, { conductor: newConductor._id });

    const populatedConductor = await newConductor.populate('operator unit');
    await createAuditLog({
      req,
      action: 'Create',
      module: 'Conductor',
      entityId: populatedConductor._id,
      summary: `Created conductor ${getFullName(populatedConductor)}`,
      before: null,
      after: populatedConductor,
    });
    res.status(201).json(populatedConductor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a single conductor
router.get('/:id', async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id).populate('operator unit');
    if (!conductor) return res.status(404).json({ message: 'Conductor not found' });
    res.json(conductor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a conductor
router.put('/:id', upload.single('conductorImage'), async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id);
    if (!conductor) return res.status(404).json({ message: 'Conductor not found' });
    const beforeSnapshot = conductor.toObject();

    const conductorData = parsePayload(req.body);
    if (conductorData.operator || conductorData.unit) {
      const nextOperator = conductorData.operator || conductor.operator;
      const nextUnit = conductorData.unit || conductor.unit;

      const unit = await Unit.findById(nextUnit);
      if (!unit || String(unit.operator) !== String(nextOperator)) {
        return res.status(400).json({ message: 'Selected unit does not belong to the selected operator.' });
      }

      // STRICT CHECK: Conductor can only be assigned to Mini Bus
      if (unit.vehicleType !== 'Mini Bus') {
        return res.status(400).json({ message: 'Conductors can only be assigned to Mini Bus units.' });
      }

      conductor.operator = nextOperator;
      conductor.unit = nextUnit;
    }

    const nextConductorData = { ...conductorData };
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      nextConductorData.photoUrl = uploadResult.secure_url;
    }

    Object.assign(conductor, nextConductorData);
    const savedConductor = await conductor.save();

    // AUTO-SYNC: Update the Unit profile to point to this conductor if it changed
    if (conductorData.unit) {
      await Unit.findByIdAndUpdate(conductorData.unit, { conductor: savedConductor._id });
    }

    const updatedConductor = await Conductor.findById(savedConductor._id).populate('operator unit');
    await createAuditLog({
      req,
      action: 'Update',
      module: 'Conductor',
      entityId: updatedConductor._id,
      summary: `Updated conductor ${getFullName(updatedConductor)}`,
      before: beforeSnapshot,
      after: updatedConductor,
    });
    res.json(updatedConductor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a conductor
router.delete('/:id', async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id);
    if (!conductor) return res.status(404).json({ message: 'Conductor not found' });
    await Conductor.findByIdAndDelete(req.params.id);
    await createAuditLog({
      req,
      action: 'Delete',
      module: 'Conductor',
      entityId: conductor._id,
      summary: `Deleted conductor ${getFullName(conductor)}`,
      before: conductor,
      after: null,
    });

    res.json({ message: 'Conductor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
