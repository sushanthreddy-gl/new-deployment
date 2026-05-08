import express from 'express';
import * as settlementController from '../controllers/settlementsController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All settlement routes require authentication
router.use(auth);

router.get('/settleGroup/:groupId', settlementController.settleGroup);
router.post('/', settlementController.create);
router.get('/group/:groupId', settlementController.listByGroup);

export default router;