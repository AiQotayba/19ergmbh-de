import { Router } from "express";
import { authenticate, requireAdmin, requireAnyRole } from "@19er/auth";
import * as payrollController from "./payroll.controller.js";

const router = Router();

router.use(authenticate);

router.post("/run", requireAdmin, payrollController.runPayrollHandler);
router.get("/runs", requireAdmin, payrollController.listPayrollRunsHandler);
router.get("/runs/:id", requireAdmin, payrollController.getPayrollRunHandler);
router.get("/", requireAnyRole, payrollController.listPayrollsHandler);
router.get("/:id", requireAnyRole, payrollController.getPayrollHandler);
router.put("/:id/pay", requireAdmin, payrollController.markPaidHandler);

export default router;
