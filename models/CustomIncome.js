import mongoose from 'mongoose';

const customIncomeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  remark: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('CustomIncome', customIncomeSchema);
