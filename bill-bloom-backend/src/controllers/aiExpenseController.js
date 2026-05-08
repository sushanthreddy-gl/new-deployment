import { parseExpenseText, analysePersonalExpenses, scanBillImageService } from '../services/aiExpenseService.js';

export const parseExpenseController = async (req, res) => {
  const { text, members } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'text is required' });
  }

  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ message: 'members array is required' });
  }

  const currentUserId = req.user._id.toString();
  const result = await parseExpenseText(text.trim(), members, currentUserId);

  return res.status(200).json(result);
};

export const analyseExpensesController = async (req, res) => {
  const { categoryData, monthlyData } = req.body;

  if (!Array.isArray(categoryData) || categoryData.length === 0) {
    return res.status(400).json({ message: 'categoryData array is required' });
  }

  const summary = await analysePersonalExpenses(categoryData, monthlyData);
  return res.status(200).json({ summary });
};

export const scanBillController = async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ message: 'image (base64) is required' });
  }

  const text = await scanBillImageService(image);
  return res.status(200).json({ text });
};
