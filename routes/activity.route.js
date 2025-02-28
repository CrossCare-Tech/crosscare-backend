import { Router } from "express";
import activityController from "../controllers/activity.controller.js";

const router = new Router();

// Route to create a new user activity
router.route('/user/:id/createactivity').post(activityController.createActivity);
router.route('/user/:id/activity/:activityId/meals').post(activityController.addMeals);
router.route('/user/:id/activity').get(activityController.getUserActivities);
router.route('/user/:id/activity/:activityId').put(activityController.updateActivity);
router.route('/user/:id/activity/:activityId/meal/:mealId').put(activityController.updateMeal);
router.route('/user/:id/activity/:activityId/meals').get(activityController.getAllMeals);

export default router;
