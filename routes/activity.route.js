import { Router } from "express";
import activityController from "../controllers/activity.controller.js";

const router = new Router();

// Route to create a new user activity
router.post('/user/activity/:id/water', activityController.logWaterIntake);
router.get('/user/activity/:id/waterstatus', activityController.getWaterStatus);
router.post('/user/activity/:id/weight', activityController.logWeight);
router.get('/user/activity/:id/weightstatus', activityController.getWeightStatus);
router.post('/user/activity/:id/steps', activityController.logSteps);
router.post('/user/activity/:id/sleep', activityController.logSleepDuration);
router.get('/user/activity/:id/sleepstatus', activityController.getSleepStatus);
router.delete('/user/activity/:id/sleepstatus/delete/:id', activityController.deleteSleepStatus);
router.post('/user/activity/:id/heart', activityController.logHeartRate);
router.get('/user/activity/:id', activityController.getUserActivities);

//note taking 
router.post('/user/activity/:id/note', activityController.createNote);
router.get('/user/activity/:id/notes', activityController.getUserNotes);
export default router;
