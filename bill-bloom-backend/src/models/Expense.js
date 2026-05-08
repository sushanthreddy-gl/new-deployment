import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    category: { type: String },
    description: { type: String },
    type: { type: String, enum: ['group', 'personal'], required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId },
    date: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);

