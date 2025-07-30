import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
});

export default mongoose.model('Class', classSchema);
