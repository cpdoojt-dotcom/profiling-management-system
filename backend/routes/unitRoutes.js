import express from 'express';
import Unit from '../models/Unit.js';
import UnitHistory from '../models/UnitHistory.js';
import Operator from '../models/Operator.js';
import Driver from '../models/Driver.js';
import Conductor from '../models/Conductor.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = express.Router();

const getFullName = (person) => {
  if (!person) return 'N/A';
  const parts = [person.firstName, person.middleName, person.lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(' ') : 'N/A';
};

// Get all units with current operator and driver details
router.get('/', async (req, res) => {
  try {
    const units = await Unit.find()
      .populate('operator')
      .populate('driver')
      .populate('conductor')
      .sort({ bodyNo: 1 });
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get history and active drivers for a specific Body Number
router.get('/history/:bodyNo', async (req, res) => {
  try {
    const history = await UnitHistory.find({ bodyNo: req.params.bodyNo })
      .sort({ createdAt: -1 });
    
    // Also find all drivers/conductors currently linked to this unit by bodyNo
    const unit = await Unit.findOne({ bodyNo: req.params.bodyNo });
    let drivers = [];
    let conductors = [];
    if (unit) {
      drivers = await Driver.find({ unit: unit._id });
      conductors = await Conductor.find({ unit: unit._id });
    }
    
    res.json({ history, drivers, conductors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Powerful search for Unit Monitoring
router.get('/search/:query', async (req, res) => {
  try {
    const q = req.params.query;
    const units = await Unit.find({ 
      $or: [
        { bodyNo: { $regex: q, $options: 'i' } },
        { plateNo: { $regex: q, $options: 'i' } }
      ]
    }).populate('operator').populate('driver').populate('conductor');
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const logUnitHistory = async (unitId, bodyNo, oldData, newData, changeType = 'Update') => {
  try {
    let summary = '';
    if (changeType === 'Creation') {
      summary = 'Initial Unit Registration';
    } else if (changeType === 'Update' && oldData && newData) {
      const changedFields = [];
      const mapping = {
        operator: 'Operator',
        driver: 'Driver',
        conductor: 'Conductor',
        vehicleType: 'Category',
        plateNo: 'Plate No',
        makeType: 'Make/Type',
        colorCode: 'Color Code',
        yearModel: 'Year Model',
        chassisNo: 'Chassis No',
        motorNo: 'Motor No',
        zone: 'Zone'
      };

      Object.keys(mapping).forEach(key => {
        const oldVal = (oldData[key]?._id || oldData[key] || '').toString();
        const newVal = (newData[key]?._id || newData[key] || '').toString();
        if (oldVal !== newVal) {
          changedFields.push(mapping[key]);
        }
      });

      if (changedFields.length > 0) {
        summary = `${changedFields.join(', ')} Updated`;
      } else {
        summary = 'General Update';
      }
    }

    await UnitHistory.create({
      unitId,
      bodyNo,
      oldData,
      newData,
      changeType,
      summary
    });
  } catch (err) {
    console.error('Failed to log unit history:', err);
  }
};

// Update unit details with history logging
router.put('/:id', async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate('operator')
      .populate('driver')
      .populate('conductor');
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const oldData = unit.toObject();
    // Pre-calculate readable names for history
    const oldSnapshot = {
      ...oldData,
      operatorName: getFullName(oldData.operator),
      driverName: getFullName(oldData.driver),
      conductorName: getFullName(oldData.conductor)
    };
    
    // Update fields
    const fields = ['bodyNo', 'plateNo', 'colorCode', 'makeType', 'chassisNo', 'motorNo', 'yearModel', 'vehicleType', 'zone', 'conductor', 'operator', 'driver'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Convert empty strings to null for ObjectIds to prevent Mongoose errors
        if ((field === 'operator' || field === 'driver' || field === 'conductor') && req.body[field] === '') {
          unit[field] = null;
        } else {
          unit[field] = req.body[field];
        }
      }
    });

    const savedUnit = await unit.save();
    const populatedUnit = await Unit.findById(savedUnit._id).populate('operator').populate('driver').populate('conductor');
    const newData = populatedUnit.toObject();

    const newSnapshot = {
      ...newData,
      operatorName: getFullName(newData.operator),
      driverName: getFullName(newData.driver),
      conductorName: getFullName(newData.conductor)
    };

    await logUnitHistory(savedUnit._id, savedUnit.bodyNo, oldSnapshot, newSnapshot, 'Update');
    await createAuditLog({
      req,
      action: 'Update',
      module: 'Unit',
      entityId: savedUnit._id,
      summary: `Updated unit Body #${savedUnit.bodyNo}`,
      before: oldData,
      after: newData,
    });

    res.json(populatedUnit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
