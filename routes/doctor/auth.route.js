import { Router } from 'express';
import doctorAuthController from '../../controllers/doctor/auth.controller.js';

const router = new Router();

// Route for doctor login
router.route('/doctor/login').post(doctorAuthController.login);

export default router;
