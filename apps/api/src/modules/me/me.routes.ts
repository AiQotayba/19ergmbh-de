import { Router } from "express";
import { authenticate, requireAnyRole } from "@19er/auth";
import * as meController from "./me.controller.js";

const router = Router();

router.use(authenticate, requireAnyRole);

router.get("/", meController.getProfileHandler);
router.get("/shifts", meController.getMyShiftsHandler);
router.get("/attendance", meController.getMyAttendanceHandler);
router.get("/payroll", meController.getMyPayrollHandler);
router.post("/check-in", meController.myCheckInHandler);
router.post("/check-out", meController.myCheckOutHandler);

export default router;
