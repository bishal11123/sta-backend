import express from 'express';
import Attendance from '../models/Attendance.js';
import Class from '../models/Class.js';

const router = express.Router();

// POST /api/attendance - Save or update attendance record
router.post('/', async (req, res) => {
  const { studentId, adDate, status } = req.body;

  if (!studentId || !adDate || !status) {
    return res.status(400).json({ error: 'studentId, adDate and status are required' });
  }

  try {
    // Check if attendance already exists for this student and date
    let attendance = await Attendance.findOne({ student: studentId, adDate });

    if (attendance) {
      attendance.status = status;
    } else {
      attendance = new Attendance({ student: studentId, adDate, status });
    }

    await attendance.save();

    res.status(200).json({ message: 'Attendance saved', attendance });
  } catch (error) {
    console.error('Attendance save error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/records - Get attendance records by class and AD month (YYYY-MM)
router.get('/records', async (req, res) => {
  const { classId, adMonth } = req.query; // ex: '2025-07'
  if (!classId || !adMonth) {
    return res.status(400).json({ error: 'classId and adMonth required' });
  }

  try {
    const cls = await Class.findById(classId).populate('students');
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const students = cls.students;

    const [year, month] = adMonth.split('-').map(Number);
    if (!year || !month) {
      return res.status(400).json({ error: 'Invalid adMonth format' });
    }

    // Date range for month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Query attendance in this month for class students
    const attendance = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      adDate: { $gte: startDate, $lt: endDate }
    });

    // Map attendance: recordsMap[studentId][YYYY-MM-DD] = status
    const recordsMap = {};
    attendance.forEach(rec => {
      const adDateStr = rec.adDate.toISOString().slice(0, 10);
      if (!recordsMap[rec.student]) recordsMap[rec.student] = {};
      recordsMap[rec.student][adDateStr] = rec.status;
    });

    res.json({ students, recordsMap });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
