import { Router } from 'express';
import badgeController from '../controllers/badge.controller.js';
const router = new Router();

router.get('/user/:id', badgeController.getPatientBadges)
router.post('/user', badgeController.awardPatientBadge)
router.get('/user/habit/:id', badgeController.getHabitBadges)
router.post('/user/habit', badgeController.awardHabitBadge)
router.post('/user/:id/badges/award', badgeController.awardMilestoneBadge)

export default router;