import express from 'express';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import Class from '../models/Class.js'; // 🔁 Import Class model





const router = express.Router();

const validCOEStatus = ['Pending', 'Applied', 'Received'];
const validVisaStatus = ['Pending', 'Applied', 'Granted', 'Rejected'];
const validAdmissionStatus = ['Admitted', 'Pending'];
const validCourseStatus = ['Not Started', 'In Progress', 'Completed'];
const validInterviewStatus = ['Not Scheduled', 'Scheduled', 'Completed', 'Passed', 'Failed'];

function validateEnumFields(data) {
  if (!validCOEStatus.includes(data.COEStatus)) {
    data.COEStatus = 'Pending';
  }
  if (!validVisaStatus.includes(data.visaStatus)) {
    data.visaStatus = 'Pending';
  }
  if (!validAdmissionStatus.includes(data.admissionStatus)) {
    data.admissionStatus = 'Pending';
  }
  if (!validCourseStatus.includes(data.courseStatus)) {
    data.courseStatus = 'Not Started';
  }
  if (!validInterviewStatus.includes(data.interviewStatus)) {
    data.interviewStatus = 'Not Scheduled';
  }
}

router.get('/', async (req, res) => {
  try {
    const students = await Student.find().populate('classId');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', async (req, res) => {
  try {
    const data = req.body;
    validateEnumFields(data);

    // ✅ Handle Rs. 2000 income logic
    data.income = data.eligibleForIncomeBonus ? 2000 : 0;

    const student = new Student(data);
    await student.save();

    // ✅ Push student ID into the Class document
    if (data.classId) {
      await Class.findByIdAndUpdate(data.classId, {
        $addToSet: { students: student._id }, // prevents duplicates
      });
    }

    res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ message: error.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    validateEnumFields(data);

    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    let income = existingStudent.income ?? 2000;
    let prevStage = existingStudent.coeBonusStage || 'None';
    let newStage = prevStage;
    const newStatus = data.COEStatus;

    // COE bonus logic (unchanged)
    if (prevStage === 'None') {
      if (newStatus === 'Applied') {
        income += 5000;
        newStage = 'Applied';
      } else if (newStatus === 'Received') {
        income += 15000;
        newStage = 'Received';
      }
    } else if (prevStage === 'Applied') {
      if (newStatus === 'Pending') {
        income -= 5000;
        newStage = 'None';
      } else if (newStatus === 'Received') {
        income += 10000;
        newStage = 'Received';
      }
    } else if (prevStage === 'Received') {
      if (newStatus === 'Applied') {
        income -= 10000;
        newStage = 'Applied';
      } else if (newStatus === 'Pending') {
        income -= 15000;
        newStage = 'None';
      }
    }

    data.income = income;
    data.coeBonusStage = newStage;

    // ==== NEW CLASS SYNC LOGIC ====
    const oldClassId = existingStudent.classId ? existingStudent.classId.toString() : null;
    const newClassId = data.classId;

    // Update student first (excluding syncing class for now)
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, data, { new: true });

    if (oldClassId !== newClassId) {
      if (oldClassId) {
        // Remove student ID from old class's students array
        await Class.findByIdAndUpdate(oldClassId, { $pull: { students: updatedStudent._id } });
      }
      if (newClassId) {
        // Add student ID to new class's students array
        await Class.findByIdAndUpdate(newClassId, { $addToSet: { students: updatedStudent._id } });
      }
    }

    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({ message: error.message });
  }
});







router.delete('/:id', async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Single /summary route with income calculation
router.get('/summary', async (req, res) => {
  const { month, year, newStudentIncome, coeAppliedIncome, coeReceivedIncome } = req.query;

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(`${year}-${month}-31`);

  const newIncome = Number(newStudentIncome) || 2000;
  const appliedIncome = Number(coeAppliedIncome) || 5000;
  const receivedIncome = Number(coeReceivedIncome) || 10000;

  const students = await Student.find({
    consultancyAdmissionDate: { $gte: start, $lte: end },
  });

  // Payments received from students
  const paymentsReceivedFromStudents = students
    .filter(s => s.paymentReceivedDate && s.paymentReceivedDate >= start && s.paymentReceivedDate <= end)
    .reduce((sum, s) => sum + (s.paymentReceived || 0), 0);

  // External payments
  const externalPayments = await Payment.find({
    date: { $gte: start, $lte: end }
  });

  const paymentsReceivedFromExternal = externalPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaymentsReceived = paymentsReceivedFromStudents + paymentsReceivedFromExternal;

  // 🟡 Dynamic income calculation
  const totalIncome = students.reduce((sum, s) => {
    let income = s.eligibleForIncomeBonus ? newIncome : 0;

    if (s.COEStatus === 'Applied' || s.COEStatus === 'Received') {
      income += appliedIncome;
    }

    if (s.COEStatus === 'Received') {
      income += receivedIncome;
    }

    return sum + income;
  }, 0);

  const paymentDue = totalIncome - totalPaymentsReceived;
  const pendingCOEs = students.filter(s => s.COEStatus === 'Pending').length;

  res.json({
    totalStudents: students.length,
    paymentsReceivedFromStudents,
    paymentsReceivedFromExternal,
    totalPaymentsReceived,
    paymentDue,
    pendingCOEs,
    totalIncome,
  });
});

router.get('/calculation', async (req, res) => {
  const { from, to, newStudentIncome, coeAppliedIncome, coeReceivedIncome } = req.query;
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const newIncome = Number(newStudentIncome) || 2000;
  const appliedIncome = Number(coeAppliedIncome) || 5000;
  const receivedIncome = Number(coeReceivedIncome) || 10000;

  const students = await Student.find({
    consultancyAdmissionDate: { $gte: fromDate, $lte: toDate }
  });

  const totalIncome = students.reduce((sum, s) => sum + (s.income || 0), 0);

  const newStudentIncomeSum = students.reduce((sum, s) => {
    return sum + (s.eligibleForIncomeBonus ? newIncome : 0);
  }, 0);

  const coeAppliedIncomeSum = students.filter(
    s => s.COEStatus === 'Applied' || s.COEStatus === 'Received'
  ).length * appliedIncome;

  const coeReceivedIncomeSum = students.filter(s => s.COEStatus === 'Received').length * receivedIncome;

  res.json({
    newStudentIncome: newStudentIncomeSum,
    coeAppliedIncome: coeAppliedIncomeSum,
    coeReceivedIncome: coeReceivedIncomeSum,
    totalIncome,
    students,
  });
});






export default router;
