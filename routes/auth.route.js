import { Router } from 'express';
import authController from '../controllers/auth.controller.js';  // Import the default export
import passwordController from '../controllers/password.controller.js';

const router = new Router();

// Route for authentication
router.route('/login').post(authController.login);
router.route('/signup').post(authController.signup);

// Password reset routes
router.route('/forgot-password').post(passwordController.requestPasswordReset);
router.route('/reset-password').post(passwordController.verifyOtpAndResetPassword);

export default router;
