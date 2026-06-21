import { Router } from "express";
import { authenticate, requireAdmin, requireAnyRole } from "@19er/auth";
import * as notificationsController from "./notifications.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requireAnyRole, notificationsController.listNotificationsHandler);
router.post("/", requireAdmin, notificationsController.createNotificationHandler);
router.post("/send-schedule", requireAdmin, notificationsController.sendScheduleHandler);
router.post("/send-salary", requireAdmin, notificationsController.sendSalaryHandler);
router.put("/:id/resend", requireAdmin, notificationsController.resendHandler);

export default router;
