import { Router } from "express";
import selfcare from "../controllers/selfcare.controller.js";

const router = new Router();

router.get('/categories', selfcare.getAllCategories);
router.get('/categories/:id', selfcare.getCategoryById);

// Exercises routes
router.get('/exercises', selfcare.getAllExercises);
router.get('/exercises/:id', selfcare.getExerciseById);
// router.post('/exercises/:id/favorite', selfcare, selfcareController.toggleFavorite);
// router.post('/exercises/:id/recent', selfcare, selfcareController.markAsRecentlyUsed);

// Patient specific routes
// router.get('/patients/:patientId/favorites', selfcare, selfcareController.getFavoriteExercises);
// router.get('/patients/:patientId/recent', selfcare, selfcareController.getRecentExercises);

// Audio routes
router.get('/audio', selfcare.getAudioTracks);

// Stories routes
router.get('/stories', selfcare.getStories);

export default router;