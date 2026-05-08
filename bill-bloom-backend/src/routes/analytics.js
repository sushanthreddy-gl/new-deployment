import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All analytics routes require authentication
router.use(auth);

router.get('/personal', analyticsController.personalMonthly);
router.get('/groups', analyticsController.groupSpending);

// NOTE: this must be declared before /group/:groupId/categories to avoid
// 'personal' being matched as a groupId param
router.get('/personal/categories', analyticsController.personalCategories);
router.get('/group/:groupId/categories', analyticsController.groupCategories);

export default router;
