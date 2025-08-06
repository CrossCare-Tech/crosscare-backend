import {Router} from 'express'
import authenticateMiddleware from '../middleware/auth.middleware.js';
import userController, { upload, upload1 } from '../controllers/user.controller.js';

const router = new Router();

router.get('/user/:id/profile', authenticateMiddleware, userController.getProfileDetails);
router.post('/user/:id/profile/image', authenticateMiddleware, upload, userController.uploadProfileImage);
router.put('/user/:id/pregnancy-week', authenticateMiddleware, userController.updatePregnancyWeek);
router.get('/user/:id/pregnancy-week', authenticateMiddleware, userController.getPregnancyWeek);
router.put('/user/:id/profile', authenticateMiddleware, userController.updateProfile);
router.post('/user/:id/avatar', authenticateMiddleware, upload1, userController.uploadAvatar);
router.delete('/user/:userId/delete-account', authenticateMiddleware, userController.deleteAccount);

export default router;

