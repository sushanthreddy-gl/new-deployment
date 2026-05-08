import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }
  },
  { timestamps: true }
);

export default mongoose.model('Settlement', settlementSchema);