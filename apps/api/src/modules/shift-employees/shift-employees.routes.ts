import { Router } from "express";
import { authenticate, requireAnyRole } from "@19er/auth";
import { listShiftEmployeesHandler } from "../shifts/shifts.controller.js";

const router = Router();

router.use(authenticate, requireAnyRole);
router.get("/", listShiftEmployeesHandler);

export default router;
