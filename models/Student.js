// ✅ Updated Student.js (Mongoose Model)
import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentName: String,
  phone: String,
  address: String,
  consultancyAdmissionDate: Date,



  selectedCollegeName: String,
  COEStatus: { type: String, enum: ['Pending', 'Applied', 'Received'], default: 'Pending' },


  

  paymentReceived: Number,
  paymentReceivedDate: Date,
  paymentRemaining: Number,
  expectedMonthOfPayment: String,

  remarks: String,
  coeBonusStage: { type: String, enum: ['None', 'Applied', 'Received'], default: 'None' },
  // models/Student.js
eligibleForIncomeBonus: { type: Boolean, default: false },



  // ✅ New income field
  income: { type: Number, default: 0 },

  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  }
});

export default mongoose.model('Student', studentSchema);
