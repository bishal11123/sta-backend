import express from 'express';
import Class from '../models/Class.js';
import Student from '../models/Student.js';

const router = express.Router();

// Get all classes with populated students
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find().populate('students');
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a class
router.post('/', async (req, res) => {
  try {
    const newClass = new Class({ name: req.body.name });
    const saved = await newClass.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a class and unset classId from students
router.delete('/:id', async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    await Student.updateMany({ classId: req.params.id }, { $set: { classId: null } });
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign student to a class (sync class.students and student.classId)
router.post('/:classId/students', async (req, res) => {
  try {
    const { studentId } = req.body;
    const classData = await Class.findById(req.params.classId);

    if (!classData.students.some(id => id.equals(studentId))) {
      classData.students.push(studentId);
      await classData.save();
    }

    await Student.findByIdAndUpdate(studentId, { classId: req.params.classId });

    // Return updated class with populated students
    const updatedClass = await Class.findById(req.params.classId).populate('students');
    res.json(updatedClass);
  } catch (error) {
    console.error('Error assigning student to class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Optionally: Remove student from class (if needed)
router.delete('/:classId/students/:studentId', async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const classData = await Class.findById(classId);

    classData.students = classData.students.filter(id => !id.equals(studentId));
    await classData.save();

    await Student.findByIdAndUpdate(studentId, { classId: null });

    const updatedClass = await Class.findById(classId).populate('students');
    res.json(updatedClass);
  } catch (error) {
    console.error('Error removing student from class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
