import express from 'express';
import { parseExpenseController, analyseExpensesController, scanBillController } from '../controllers/aiExpenseController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/parse-expense', auth, parseExpenseController);
router.post('/analyse-personal', auth, analyseExpensesController);
router.post('/scan-bill', auth, scanBillController);

export default router;
