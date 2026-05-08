import express from 'express';
import * as userController from '../controllers/usersController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(auth);

router.get('/search', userController.search);

export default router;
