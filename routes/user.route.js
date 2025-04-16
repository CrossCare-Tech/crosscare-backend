import {Router} from 'express'
import getProfileDetails from '../controllers/user.controller.js';
import authenticateMiddleware from '../middleware/auth.middleware.js';
import userController, { upload } from '../controllers/user.controller.js';

const router = new Router();

router.get('/user/:id/profile', authenticateMiddleware, userController.getProfileDetails);
router.post('/user/:id/profile/image', authenticateMiddleware, upload, userController.uploadProfileImage);
router.put('/user/:id/pregnancy-week', authenticateMiddleware, userController.updatePregnancyWeek);
router.get('/user/:id/pregnancy-week', authenticateMiddleware, userController.getPregnancyWeek);
router.put('/user/:id/profile', authenticateMiddleware, userController.updateProfile);

export default router;

