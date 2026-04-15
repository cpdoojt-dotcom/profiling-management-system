import express from 'express';
import multer from 'multer';
import Driver from '../models/Driver.js';
import Operator from '../models/Operator.js';
import { uploadImageBuffer } from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const parsePayload = (body) => {
  if (body.driver) {
    const operatorData = typeof body.operator === 'string' ? JSON.parse(body.operator) : (body.operator || {});
    const driverData = typeof body.driver === 'string' ? JSON.parse(body.driver) : body.driver;
    return { operatorData, driverData };
  }
  return { operatorData: {}, driverData: body };
};

const normalizeOperatorData = (operatorData) => ({
  bodyNo: operatorData.bodyNo,
  lastName: operatorData.lastName,
  firstName: operatorData.firstName,
  middleName: operatorData.middleName,
  civilStatus: operatorData.civilStatus,
  age: operatorData.age,
  addressNo: operatorData.addressNo,
  street: operatorData.street,
  purok: operatorData.purok,
  barangay: operatorData.barangay,
  cityMunicipality: operatorData.cityMunicipality,
  contactNo: operatorData.contactNo,
  ltfrbMchCaseNo: operatorData.ltfrbMchCaseNo,
  colorCode: operatorData.colorCode,
  makeType: operatorData.makeType,
  chassisNo: operatorData.chassisNo,
  motorNo: operatorData.motorNo,
  plateNo: operatorData.plateNo,
  yearModel: operatorData.yearModel,
});

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find()
      .populate('operator')
      .sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const upsertOperator = async (operatorData, fallbackOperatorId) => {
  const normalizedOperator = normalizeOperatorData(operatorData);
  if (!normalizedOperator.bodyNo && fallbackOperatorId) {
    await Operator.findByIdAndUpdate(fallbackOperatorId, normalizedOperator, { new: true, runValidators: true });
    return Operator.findById(fallbackOperatorId);
  }

  let operator = await Operator.findOne({ bodyNo: normalizedOperator.bodyNo });
  if (operator) {
    operator = await Operator.findByIdAndUpdate(operator._id, normalizedOperator, { new: true, runValidators: true });
  } else {
    operator = await Operator.create(normalizedOperator);
  }
  return operator;
};

// Create a new driver
router.post('/', upload.single('driverImage'), async (req, res) => {
  try {
    const { operatorData, driverData } = parsePayload(req.body);
    if (!driverData || Object.keys(driverData).length === 0) {
      return res.status(400).json({ message: 'Driver data is required.' });
    }

    let operatorId = driverData.operator;
    if (operatorData && Object.keys(operatorData).length > 0) {
      if (!operatorData.bodyNo) {
        return res.status(400).json({ message: 'Body No. is required for operator records.' });
      }
      const operator = await upsertOperator(operatorData);
      operatorId = operator._id;
    }

    if (!operatorId) {
      return res.status(400).json({ message: 'Please select or provide an operator for this driver.' });
    }

    const nextDriverData = { ...driverData };
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      nextDriverData.photoUrl = uploadResult.secure_url;
    }

    const driver = new Driver({
      ...driverData,
      ...nextDriverData,
      operator: operatorId,
    });
    const newDriver = await driver.save();
    const populatedDriver = await newDriver.populate('operator');
    res.status(201).json(populatedDriver);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get operators summary data
router.get('/meta/summary', async (_req, res) => {
  try {
    const operators = await Operator.countDocuments();
    const totalVehicles = await Operator.distinct('bodyNo');
    const totalDrivers = await Driver.countDocuments();
    res.json({
      operators,
      drivers: totalDrivers,
      vehicles: totalVehicles.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single driver
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('operator');
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

    const { operatorData, driverData } = parsePayload(req.body);
    if (operatorData && Object.keys(operatorData).length > 0) {
      const operator = await upsertOperator(operatorData, driver.operator);
      driver.operator = operator._id;
    }

    const nextDriverData = { ...driverData };
    if (req.file?.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      nextDriverData.photoUrl = uploadResult.secure_url;
    }

    Object.assign(driver, nextDriverData);
    const savedDriver = await driver.save();
    const updatedDriver = await Driver.findById(savedDriver._id).populate('operator');
    res.json(updatedDriver);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a driver
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const stillAssigned = await Driver.exists({ operator: driver.operator });
    if (!stillAssigned) {
      await Operator.findByIdAndDelete(driver.operator);
    }

    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
