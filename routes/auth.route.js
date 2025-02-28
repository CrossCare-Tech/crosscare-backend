import { Router } from 'express';
import authController from '../controllers/auth.controller.js';  // Import the default export

const router = new Router();

// Route for login
router.route('/login').post(authController.login);

// Route for signup
router.route('/signup').post(authController.signup);

export default router;
