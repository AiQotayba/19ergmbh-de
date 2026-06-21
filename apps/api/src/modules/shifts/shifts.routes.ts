import { Router } from "express";
import { authenticate, requireAdmin, requireAnyRole } from "@19er/auth";
import * as shiftsController from "./shifts.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requireAnyRole, shiftsController.listShiftsHandler);
router.get("/employees", requireAnyRole, shiftsController.listShiftEmployeesHandler);
router.post("/assign", requireAdmin, shiftsController.assignHandler);
router.delete("/unassign", requireAdmin, shiftsController.unassignHandler);
router.post("/", requireAdmin, shiftsController.createShiftHandler);
router.get("/:id", requireAnyRole, shiftsController.getShiftHandler);
router.put("/:id", requireAdmin, shiftsController.updateShiftHandler);
router.delete("/:id", requireAdmin, shiftsController.deleteShiftHandler);

export default router;
