import { Router } from "express";
import activityController from "../controllers/activity.controller.js";

const router = new Router();

// Route to create a new user activity
router.post('/user/activity/:id/water', activityController.logWaterIntake);
router.post('/user/activity/:id/waterGoal', activityController.WaterGoal);
router.get('/user/activity/:id/waterstatus', activityController.getWaterStatus);
router.post('/user/activity/:id/weight', activityController.logWeight);
router.get('/user/activity/:id/weightstatus', activityController.getWeightStatus);
router.post('/user/activity/:id/steps', activityController.logSteps);
router.post('/user/activity/:id/stepsGoal', activityController.StepsGoal);
router.get('/user/activity/:id/stepsStatus', activityController.getStepsStatus);
router.post('/user/activity/:id/sleep', activityController.logSleepDuration);
router.get('/user/activity/:id/sleepstatus', activityController.getSleepStatus);
router.delete('/user/activity/:id/sleepstatus/delete/:id', activityController.deleteSleepStatus);
router.post('/user/activity/:id/heart', activityController.logHeartRate);
router.get('/user/activity/:id/heartstatus', activityController.getHeartRate);
router.get('/user/activity/:id', activityController.getUserActivities);

//note taking 
router.post('/user/activity/:id/note', activityController.createNote);
router.put('/user/activity/:id/note/:noteId', activityController.editNote);
router.get('/user/activity/:id/notes', activityController.getUserNotes);

//add Medication
router.post('/user/activity/:id/addMedication', activityController.addMedication);
router.get('/user/activity/:id/getMedication', activityController.getMedications);
router.patch('/user/activity/:id/updateStatus/:id/completed', activityController.markMedicationCompleted);

//add image in journal 
// router.post(
//     '/user/activity/:id/journal', 
//     activityController.upload.single('image'), 
//     activityController.addJournalEntry
//   );
  
//   // Get all journal entries for a patient
// router.get('/user/activity/:id/journal', activityController.getJournalEntries);
  
//   // Get a specific journal entry
// router.get('/user/activity/:id/journal/:entryId', activityController.getJournalEntry);
  
// Update a journal entry (with optional new image)
// router.put(
//     '/user/activity/:id/journal/:entryId', 
//     journalController.upload.single('image'), 
//     journalController.updateJournalEntry
//   );

export default router;
