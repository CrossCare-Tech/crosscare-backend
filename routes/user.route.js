import {Router} from 'express'
import getProfileDetails from '../controllers/user.controller.js';
import authenticateMiddleware from '../middleware/auth.middleware.js';

const router = new Router();

router.get('/user/:id/profile', authenticateMiddleware, getProfileDetails)

export default router;

