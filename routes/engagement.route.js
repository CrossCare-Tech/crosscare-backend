import { Router } from "express";
import engagementController from "../controllers/engagement.controller.js";

const router = new Router();

router.post("/user/:id/ai-engagement", engagementController.logSession);
router.get("/user/:id/ai-engagement", engagementController.getEngagements);

export default router;
