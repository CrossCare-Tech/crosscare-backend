import {Router} from 'express'
import getProfileDetails from '../controllers/user.controller.js';
import authenticateMiddleware from '../middleware/auth.middleware.js';
import userController, { upload } from '../controllers/user.controller.js';

const router = new Router();

router.get('/user/:id/profile', authenticateMiddleware, userController.getProfileDetails);
router.post('/user/:id/profile/image', authenticateMiddleware, upload, userController.uploadProfileImage);

export default router;

