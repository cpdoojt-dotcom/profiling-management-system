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
    
    // Find unit and populate current driver/conductor representing who is ACTUALLY active
    const unit = await Unit.findOne({ bodyNo: req.params.bodyNo })
      .populate('driver')
      .populate('conductor')
      .populate('driverHistory.driver');
      
    let drivers = [];
    let conductors = [];
    let driverHistory = [];
    if (unit) {
      if (unit.driver) drivers = [unit.driver];
      if (unit.conductor) conductors = [unit.conductor];
      if (unit.driverHistory) driverHistory = unit.driverHistory;
    }
    
    res.json({ history, drivers, conductors, driverHistory });
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
        zone: 'Zone',
        ltfrbMchCaseNo: 'LTFRB Case No'
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
    
    const oldDriverId = unit.driver ? unit.driver._id : null;
    const oldConductorId = unit.conductor ? unit.conductor._id : null;

    // Update fields
    const fields = ['bodyNo', 'plateNo', 'colorCode', 'makeType', 'chassisNo', 'motorNo', 'yearModel', 'vehicleType', 'zone', 'conductor', 'operator', 'driver', 'ltfrbMchCaseNo'];
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

    const newDriverId = savedUnit.driver;
    const newConductorId = savedUnit.conductor;

    // 0. Update Driver History on the Unit
    if (String(oldDriverId) !== String(newDriverId)) {
      if (oldDriverId) {
        const historyItem = savedUnit.driverHistory.find(h => String(h.driver) === String(oldDriverId) && !h.endDate);
        if (historyItem) {
          historyItem.endDate = new Date();
        }
      }
      if (newDriverId) {
        savedUnit.driverHistory.push({ driver: newDriverId, startDate: new Date() });
      }
      await savedUnit.save();
    }

    // 1. Sync Driver
    if (String(oldDriverId) !== String(newDriverId)) {
      if (oldDriverId) {
        await Driver.findByIdAndUpdate(oldDriverId, { unit: null });
      }
      if (newDriverId) {
        // Clear this driver from any other unit they were previously assigned to
        await Unit.updateMany(
          { _id: { $ne: savedUnit._id }, driver: newDriverId },
          { driver: null }
        );
        // Also update this driver's unit reference in the Driver collection
        await Driver.findByIdAndUpdate(newDriverId, { unit: savedUnit._id });
      }
    }

    // 2. Sync Conductor
    if (String(oldConductorId) !== String(newConductorId)) {
      if (oldConductorId) {
        await Conductor.findByIdAndUpdate(oldConductorId, { unit: null });
      }
      if (newConductorId) {
        // Clear this conductor from any other unit they were previously assigned to
        await Unit.updateMany(
          { _id: { $ne: savedUnit._id }, conductor: newConductorId },
          { conductor: null }
        );
        // Also update this conductor's unit reference in the Conductor collection
        await Conductor.findByIdAndUpdate(newConductorId, { unit: savedUnit._id });
      }
    }

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
