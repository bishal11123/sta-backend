import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  remarks: { type: String }
});

export default mongoose.model('Payment', paymentSchema);
