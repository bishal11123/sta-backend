import express from 'express';
import Payment from '../models/Payment.js';

const router = express.Router();

// Add new payment
router.post('/', async (req, res) => {
  try {
    const { amount, date, remarks } = req.body;

    const payment = new Payment({
      amount,
      remarks,
      date: new Date(date) // ✅ ensure it's a proper Date object
    });

    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Get payments for dashboard summary
// Example Express route: GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};

    // ✅ Only apply date filter if both from & to are provided
    if (from && to) {
      query.date = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const payments = await Payment.find(query).sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});



export default router;
