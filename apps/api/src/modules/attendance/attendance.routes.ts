import { Router } from "express";
import { authenticate, requireAdmin, requireAnyRole } from "@19er/auth";
import * as attendanceController from "./attendance.controller.js";

const router = Router();

router.use(authenticate);

router.post("/check-in", requireAnyRole, attendanceController.checkInHandler);
router.post("/check-out", requireAnyRole, attendanceController.checkOutHandler);
router.post("/absent", requireAdmin, attendanceController.markAbsentHandler);
router.post("/holiday", requireAdmin, attendanceController.markHolidayHandler);
router.get("/", requireAnyRole, attendanceController.listAttendanceHandler);

export default router;
