import express from 'express';
import CustomIncome from '../models/CustomIncome.js';

const router = express.Router();

// GET all custom incomes
router.get('/', async (req, res) => {
  const incomes = await CustomIncome.find().sort({ date: -1 });
  res.json(incomes);
});

// POST new income
router.post('/', async (req, res) => {
  try {
    const { amount, remark } = req.body;
    const income = new CustomIncome({ amount, remark });
    await income.save();
    res.status(201).json(income);
  } catch (error) {
    res.status(400).json({ message: 'Error saving income' });
  }
});

// DELETE income
router.delete('/:id', async (req, res) => {
  await CustomIncome.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
