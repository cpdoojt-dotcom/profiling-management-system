import express from 'express';
import multer from 'multer';
import Driver from '../models/Driver.js';
import Operator from '../models/Operator.js';
import Unit from '../models/Unit.js';
import Conductor from '../models/Conductor.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const getFullName = (person) => {
  if (!person) return '';
  const parts = [person.firstName, person.middleName, person.lastName];
  if (person.extensionName) parts.push(person.extensionName);
  return parts
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const parsePayload = (body) => {
  if (!body.driver) {
    return typeof body === 'string' ? JSON.parse(body) : body;
  }
  return typeof body.driver === 'string' ? JSON.parse(body.driver) : body.driver;
};

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find()
      .populate('operator')
      .populate('unit')
      .sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new driver
router.post('/', upload.single('driverImage'), async (req, res) => {
  try {
    const driverData = parsePayload(req.body);
    if (!driverData || Object.keys(driverData).length === 0) {
      return res.status(400).json({ message: 'Driver data is required.' });
    }

    const operatorId = driverData.operator;
    const unitId = driverData.unit;

    if (!operatorId || !unitId) {
      return res.status(400).json({ message: 'Please select an operator and unit for this driver.' });
    }

    const unit = await Unit.findById(unitId);
    if (!unit || String(unit.operator) !== String(operatorId)) {
      return res.status(400).json({ message: 'Selected unit does not belong to the selected operator.' });
    }

    const nextDriverData = { ...driverData };
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      nextDriverData.photoUrl = uploadResult.secure_url;
    }

    const driver = new Driver({
      ...driverData,
      ...nextDriverData,
      middleName: driverData.middleName || '',
      extensionName: driverData.extensionName || '',
      operator: operatorId,
      unit: unitId,
    });
    const newDriver = await driver.save();

    // AUTO-SYNC: Update the Unit profile to reflect this new driver
    await Unit.findByIdAndUpdate(unitId, { 
      driver: newDriver._id,
      $push: { driverHistory: { driver: newDriver._id, startDate: new Date() } }
    });

    const populatedDriver = await newDriver.populate('operator unit');
    await createAuditLog({
      req,
      action: 'Create',
      module: 'Driver',
      entityId: populatedDriver._id,
      summary: `Created driver ${getFullName(populatedDriver)}`,
      before: null,
      after: populatedDriver,
    });
    res.status(201).json(populatedDriver);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get operators summary data
router.get('/meta/summary', async (_req, res) => {
  try {
    const operators = await Operator.countDocuments();
    const totalVehicles = await Unit.countDocuments();
    const totalDrivers = await Driver.countDocuments();
    
    const tricycleDrivers = await Driver.countDocuments({ driverType: 'Tricycle' });
    const jeepneyDrivers = await Driver.countDocuments({ driverType: 'Jeepney' });
    const minibusDrivers = await Driver.countDocuments({ driverType: 'Mini Bus' });
    const totalConductors = await Conductor.countDocuments();

    const tricycleUnits = await Unit.countDocuments({ vehicleType: 'Tricycle' });
    const jeepneyUnits = await Unit.countDocuments({ vehicleType: 'Jeepney' });
    const minibusUnits = await Unit.countDocuments({ vehicleType: 'Mini Bus' });

    res.json({
      operators,
      drivers: totalDrivers,
      vehicles: totalVehicles,
      conductors: totalConductors,
      tricycleDrivers,
      jeepneyDrivers,
      minibusDrivers,
      tricycleUnits,
      jeepneyUnits,
      minibusUnits
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single driver
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('operator unit');
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a driver
router.put('/:id', upload.single('driverImage'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    const beforeSnapshot = driver.toObject();

    const driverData = parsePayload(req.body);
    if (driverData.operator !== undefined || driverData.unit !== undefined) {
      const nextOperator = driverData.operator === '' ? null : (driverData.operator || driver.operator);
      const nextUnit = driverData.unit === '' ? null : (driverData.unit || driver.unit);

      if (nextUnit && nextOperator) {
        const unit = await Unit.findById(nextUnit);
        if (!unit || String(unit.operator) !== String(nextOperator)) {
          return res.status(400).json({ message: 'Selected unit does not belong to the selected operator.' });
        }
      }
      driver.operator = nextOperator;
      driver.unit = nextUnit;
    }

    const nextDriverData = { ...driverData };
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      nextDriverData.photoUrl = uploadResult.secure_url;
    }

    Object.assign(driver, nextDriverData);
    const savedDriver = await driver.save();

    const oldUnitId = beforeSnapshot.unit;
    const newUnitId = savedDriver.unit;
    if (String(oldUnitId) !== String(newUnitId)) {
      // 1. Clear the driver field of the old unit
      if (oldUnitId) {
        const oldUnit = await Unit.findById(oldUnitId);
        if (oldUnit) {
          const historyItem = oldUnit.driverHistory.find(h => String(h.driver) === String(savedDriver._id) && !h.endDate);
          if (historyItem) historyItem.endDate = new Date();
          oldUnit.driver = null;
          await oldUnit.save();
        }
      }
      // 2. Set the driver field of the new unit
      if (newUnitId) {
        // Also clear any other driver who was previously assigned to this new unit!
        const targetUnit = await Unit.findById(newUnitId);
        if (targetUnit) {
          if (targetUnit.driver) {
            const prevDriverId = targetUnit.driver;
            await Driver.findByIdAndUpdate(prevDriverId, { unit: null, operator: null });
            const historyItem = targetUnit.driverHistory.find(h => String(h.driver) === String(prevDriverId) && !h.endDate);
            if (historyItem) historyItem.endDate = new Date();
          }
          targetUnit.driver = savedDriver._id;
          targetUnit.driverHistory.push({ driver: savedDriver._id, startDate: new Date() });
          await targetUnit.save();
        }
      }
    }

    const updatedDriver = await Driver.findById(savedDriver._id).populate('operator unit');
    await createAuditLog({
      req,
      action: 'Update',
      module: 'Driver',
      entityId: updatedDriver._id,
      summary: `Updated driver ${getFullName(updatedDriver)}`,
      before: beforeSnapshot,
      after: updatedDriver,
    });
    res.json(updatedDriver);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a driver
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    // Cleanup unit driverHistory if driver was assigned to a unit
    if (driver.unit) {
      const unit = await Unit.findById(driver.unit);
      if (unit) {
        const historyItem = unit.driverHistory.find(h => String(h.driver) === String(driver._id) && !h.endDate);
        if (historyItem) {
          historyItem.endDate = new Date();
        }
        if (String(unit.driver) === String(driver._id)) {
          unit.driver = null;
        }
        await unit.save();
      }
    }

    await Driver.findByIdAndDelete(req.params.id);
    await createAuditLog({
      req,
      action: 'Delete',
      module: 'Driver',
      entityId: driver._id,
      summary: `Deleted driver ${getFullName(driver)}`,
      before: driver,
      after: null,
    });

    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
