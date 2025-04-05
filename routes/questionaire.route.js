import { Router } from "express";
import questionnaireController from "../controllers/questionarie.controller.js";

const router = new Router();

router.post('/user/:id/domain', questionnaireController.submitResponse);
router.get('/user/:patientId/responses', questionnaireController.getAnsweredQuestions);
router.get('/user/:questionnaireId/responses', questionnaireController.getQuestionnaireResponses);
export default router;