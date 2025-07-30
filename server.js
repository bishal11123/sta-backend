import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import studentRoutes from './routes/studentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import customIncomeRoutes from './routes/customIncomeRoutes.js';
import classRoutes from './routes/classRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';




import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/custom-incomes', customIncomeRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);





mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  app.listen(process.env.PORT || 5001, () => {
    console.log(`Server running on port ${process.env.PORT || 5001}`);
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
