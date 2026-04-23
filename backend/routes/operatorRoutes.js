import express from 'express';
import Operator from '../models/Operator.js';
import Driver from '../models/Driver.js';
import Unit from '../models/Unit.js';
import UnitHistory from '../models/UnitHistory.js';
import Conductor from '../models/Conductor.js';

const router = express.Router();

const normalizeOperatorData = (operatorData) => ({
  lastName: operatorData.lastName,
  firstName: operatorData.firstName,
  middleName: operatorData.middleName,
  civilStatus: operatorData.civilStatus,
  birthdate: operatorData.birthdate,
  birthplace: operatorData.birthplace,
  age: operatorData.age,
  addressNo: operatorData.addressNo,
  street: operatorData.street,
  purok: operatorData.purok,
  barangay: operatorData.barangay,
  cityMunicipality: operatorData.cityMunicipality,
  contactNo: operatorData.contactNo,
  ltfrbMchCaseNo: operatorData.ltfrbMchCaseNo,
  operatorType: operatorData.operatorType || 'Tricycle',
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

// Create operator record with at least one unit
router.post('/', async (req, res) => {
  try {
    const operatorData = req.body.operator || req.body;
    const units = Array.isArray(req.body.units) ? req.body.units : [];

    if (units.length === 0) {
      return res.status(400).json({ message: 'At least one unit is required.' });
    }

    const operator = await Operator.create(normalizeOperatorData(operatorData));
    const createdUnits = await Unit.insertMany(
      units.map((unit) => ({
        ...normalizeUnitData(unit),
        operator: operator._id,
      })),
    );

    // Initial history
    for (const unit of createdUnits) {
      await logUnitHistory(unit._id, unit.bodyNo, null, unit.toObject(), 'Creation');
    }

    res.status(201).json({ ...operator.toObject(), units: createdUnits });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add unit under an existing operator
router.post('/:id/units', async (req, res) => {
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
    
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update operator details
router.put('/:id', async (req, res) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });

    const updatedData = normalizeOperatorData(req.body);
    Object.assign(operator, updatedData);
    
    await operator.save();
    
    res.json(operator);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all operators with linked units, drivers, and conductors
router.get('/', async (_req, res) => {
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
