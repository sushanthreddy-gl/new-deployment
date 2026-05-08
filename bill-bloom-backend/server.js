import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import groupRoutes from './src/routes/groups.js';
import expenseRoutes from './src/routes/expenses.js';
import settlementRoutes from './src/routes/settlements.js';
import analyticsRoutes from './src/routes/analytics.js';
import userRoutes from './src/routes/user.js';
import aiExpenseRoutes from './src/routes/aiExpense.js';
import errorHandler from './src/middleware/errorHandler.js';

const app = express();

// enable JSON body parsing (10mb limit for image uploads) and CORS
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// mount routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiExpenseRoutes);

// GET /ping → { message: "pong" }
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Global error handler (must be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to DB', err);
    process.exit(1);
  });