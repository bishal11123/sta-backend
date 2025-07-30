// models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  adDate: { type: Date, required: true }, // Only store AD date
  status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Late'], required: true }
});

export default mongoose.model('Attendance', attendanceSchema);
