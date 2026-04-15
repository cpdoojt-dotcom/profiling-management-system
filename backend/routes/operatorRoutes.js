import express from 'express';
import Operator from '../models/Operator.js';
import Driver from '../models/Driver.js';

const router = express.Router();

// Create operator record
router.post('/', async (req, res) => {
  try {
    const operator = await Operator.create(req.body);
    res.status(201).json(operator);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all operators with linked drivers
router.get('/', async (_req, res) => {
  try {
    const operators = await Operator.find().sort({ createdAt: -1 }).lean();
    const operatorIds = operators.map((operator) => operator._id);

    const drivers = await Driver.find({ operator: { $in: operatorIds } })
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

    const payload = operators.map((operator) => {
      const linkedDrivers = groupedDrivers.get(String(operator._id)) || [];
      return {
        ...operator,
        driverCount: linkedDrivers.length,
        drivers: linkedDrivers,
      };
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
