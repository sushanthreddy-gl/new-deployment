import express from 'express';
import * as groupController from '../controllers/groupsController.js';
import auth from '../middleware/auth.js';
import isGroupCreator from '../middleware/isGroupCreator.js';

const router = express.Router();

// All group routes require authentication
router.use(auth);

router.post('/', groupController.create);
router.get('/', groupController.list);
router.put('/:id', isGroupCreator, groupController.update);

// GROUP DETAILS
router.get('/:id', groupController.details);

// DELETE GROUP
router.delete('/:id', isGroupCreator, groupController.remove);

export default router;