import express from 'express';
import multer from 'multer';
import Operator from '../models/Operator.js';
import Driver from '../models/Driver.js';
import Unit from '../models/Unit.js';
import UnitHistory from '../models/UnitHistory.js';
import Conductor from '../models/Conductor.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { createAuditLog } from '../utils/auditLog.js';
import { protect, canWrite } from '../middleware/authMiddleware.js';

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

const normalizeOperatorData = (operatorData) => ({
  lastName: operatorData.lastName,
  firstName: operatorData.firstName,
  middleName: operatorData.middleName || '',
  extensionName: operatorData.extensionName || '',
  civilStatus: operatorData.civilStatus,
  age: operatorData.age,
  addressNo: operatorData.addressNo,
  street: operatorData.street,
  purok: operatorData.purok,
  barangay: operatorData.barangay,
  cityMunicipality: operatorData.cityMunicipality,
  contactNo: operatorData.contactNo,
  ltfrbMchCaseNo: operatorData.ltfrbMchCaseNo,
  operatorType: operatorData.operatorType || 'FOR HIRE',
  photoUrl: operatorData.photoUrl,
  transferStatus: operatorData.transferStatus || 'None',
});

const normalizeUnitData = (unitData) => ({
  bodyNo: unitData.bodyNo,
  colorCode: unitData.colorCode,
  makeType: unitData.makeType,
  chassisNo: unitData.chassisNo,
  motorNo: unitData.motorNo,
  plateNo: unitData.plateNo,
  yearModel: unitData.yearModel,
  vehicleType: unitData.vehicleType || 'Tricycle',
  zone: unitData.zone,
  conductorName: unitData.conductorName,
  ltfrbMchCaseNo: unitData.ltfrbMchCaseNo,
});

const logUnitHistory = async (unitId, bodyNo, oldData, newData, changeType = 'Update') => {
  try {
    await UnitHistory.create({
      unitId,
      bodyNo,
      oldData,
      newData,
      changeType,
    });
  } catch (err) {
    console.error('Failed to log unit history:', err);
  }
};

// Create or Update operator record with units and optional drivers/conductors
router.post('/', protect, canWrite, upload.single('operatorImage'), async (req, res) => {
  try {
    let operatorData;
    if (req.body.operator) {
      operatorData = typeof req.body.operator === 'string' ? JSON.parse(req.body.operator) : req.body.operator;
    } else {
      operatorData = req.body;
    }
    const unitsData = Array.isArray(req.body.units) 
      ? req.body.units 
      : (typeof req.body.units === 'string' ? JSON.parse(req.body.units) : []);

    if (unitsData.length === 0) {
      return res.status(400).json({ message: 'At least one unit is required.' });
    }

    // Handle image upload
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      operatorData.photoUrl = uploadResult.secure_url;
    }

    // Upsert Operator (Find by Full Name)
    const operator = await Operator.findOneAndUpdate(
      { 
        firstName: operatorData.firstName, 
        middleName: operatorData.middleName || '',
        lastName: operatorData.lastName,
        extensionName: operatorData.extensionName || ''
      },
      normalizeOperatorData(operatorData),
      { upsert: true, new: true, runValidators: true }
    );
    
    const createdUnits = [];
    for (const unitData of unitsData) {
      // Upsert Unit (Find by Operator and Body No)
      const existingUnit = await Unit.findOne({ 
        operator: operator._id, 
        bodyNo: unitData.bodyNo 
      });

      let unit;
      if (existingUnit) {
        const beforeSnapshot = existingUnit.toObject();
        Object.assign(existingUnit, normalizeUnitData(unitData));
        unit = await existingUnit.save();
        await logUnitHistory(unit._id, unit.bodyNo, beforeSnapshot, unit.toObject(), 'Update (Import)');
      } else {
        unit = await Unit.create({
          ...normalizeUnitData(unitData),
          operator: operator._id,
        });
        await logUnitHistory(unit._id, unit.bodyNo, null, unit.toObject(), 'Creation (Import)');
      }
      
      createdUnits.push(unit);

      // Upsert Driver
      if (unitData.driver) {
        const driver = await Driver.findOneAndUpdate(
          { 
            firstName: unitData.driver.firstName, 
            lastName: unitData.driver.lastName 
          },
          { ...unitData.driver, operator: operator._id, unit: unit._id },
          { upsert: true, new: true }
        );
        unit.driver = driver._id;
        await unit.save();
      }

      // Upsert Conductor
      if (unitData.conductor) {
        const conductor = await Conductor.findOneAndUpdate(
          { 
            firstName: unitData.conductor.firstName, 
            lastName: unitData.conductor.lastName 
          },
          { ...unitData.conductor, operator: operator._id, unit: unit._id },
          { upsert: true, new: true }
        );
        unit.conductor = conductor._id;
        await unit.save();
      }
    }

    await createAuditLog({
      req,
      action: 'Update',
      module: 'Operator',
      entityId: operator._id,
      summary: `Imported/Updated operator ${getFullName(operator)} with ${createdUnits.length} units`,
      before: null,
      after: operator,
    });

    res.status(201).json({ ...operator.toObject(), units: createdUnits });
  } catch (err) {
    console.error('Master Import Error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Add unit under an existing operator
router.post('/:id/units', protect, canWrite, async (req, res) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });

    if (!req.body?.bodyNo) {
      return res.status(400).json({ message: 'Body No. is required.' });
    }

    const unit = await Unit.create({
      ...normalizeUnitData(req.body),
      operator: operator._id,
    });
    
    await logUnitHistory(unit._id, unit.bodyNo, null, unit.toObject(), 'Creation');
    await createAuditLog({
      req,
      action: 'Create',
      module: 'Unit',
      entityId: unit._id,
      summary: `Created unit Body #${unit.bodyNo}`,
      before: null,
      after: unit,
    });
    
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update operator details
router.put('/:id', protect, canWrite, upload.single('operatorImage'), async (req, res) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });
    const beforeSnapshot = operator.toObject();

    let operatorData;
    if (req.body.operator) {
      operatorData = typeof req.body.operator === 'string' ? JSON.parse(req.body.operator) : req.body.operator;
    } else {
      operatorData = req.body;
    }

    const updatedData = normalizeOperatorData(operatorData);
    Object.assign(operator, updatedData);

    // Only update photoUrl if a new image is uploaded
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      operator.photoUrl = uploadResult.secure_url;
    } else {
      // Preserve existing photoUrl if no new image is uploaded
      if (operatorData.photoUrl === undefined || operatorData.photoUrl === null) {
        operator.photoUrl = beforeSnapshot.photoUrl;
      }
    }
    
    await operator.save();
    await createAuditLog({
      req,
      action: 'Update',
      module: 'Operator',
      entityId: operator._id,
      summary: `Updated operator ${getFullName(operator)}`,
      before: beforeSnapshot,
      after: operator,
    });
    
    res.json(operator);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete operator and related records
router.delete('/:id', protect, canWrite, async (req, res) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });

    const units = await Unit.find({ operator: operator._id }).select('_id');
    const unitIds = units.map((unit) => unit._id);

    await Driver.deleteMany({ operator: operator._id });
    await Conductor.deleteMany({ operator: operator._id });
    if (unitIds.length > 0) {
      await UnitHistory.deleteMany({ unitId: { $in: unitIds } });
    }
    await Unit.deleteMany({ operator: operator._id });
    await Operator.findByIdAndDelete(operator._id);

    await createAuditLog({
      req,
      action: 'Delete',
      module: 'Operator',
      entityId: operator._id,
      summary: `Deleted operator ${getFullName(operator)}`,
      before: operator,
      after: null,
    });

    res.json({ message: 'Operator deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all operators with linked units, drivers, and conductors
router.get('/', protect, async (_req, res) => {
  try {
    const operators = await Operator.find().sort({ createdAt: -1 }).lean();
    const operatorIds = operators.map((operator) => operator._id);
    
    const units = await Unit.find({ operator: { $in: operatorIds } }).sort({ bodyNo: 1 }).lean();

    const drivers = await Driver.find({ operator: { $in: operatorIds } })
      .populate('unit')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    const conductors = await Conductor.find({ operator: { $in: operatorIds } })
      .populate('unit')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    const groupedDrivers = new Map();
    drivers.forEach((driver) => {
      const key = String(driver.operator);
      if (!groupedDrivers.has(key)) {
        groupedDrivers.set(key, []);
      }
      groupedDrivers.get(key).push(driver);
    });

    const groupedConductors = new Map();
    conductors.forEach((conductor) => {
      const key = String(conductor.operator);
      if (!groupedConductors.has(key)) {
        groupedConductors.set(key, []);
      }
      groupedConductors.get(key).push(conductor);
    });

    const groupedUnits = new Map();
    units.forEach((unit) => {
      const key = String(unit.operator);
      if (!groupedUnits.has(key)) {
        groupedUnits.set(key, []);
      }
      groupedUnits.get(key).push(unit);
    });

    const payload = operators.map((operator) => {
      const linkedDrivers = groupedDrivers.get(String(operator._id)) || [];
      const linkedConductors = groupedConductors.get(String(operator._id)) || [];
      const linkedUnits = groupedUnits.get(String(operator._id)) || [];
      return {
        ...operator,
        units: linkedUnits,
        unitCount: linkedUnits.length,
        driverCount: linkedDrivers.length,
        conductorCount: linkedConductors.length,
        drivers: linkedDrivers,
        conductors: linkedConductors,
      };
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
