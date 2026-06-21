import { Router } from "express";
import { authenticate, requireAdmin } from "@19er/auth";
import * as dashboardController from "./dashboard.controller.js";

const router = Router();

router.get("/health", dashboardController.healthHandler);
router.get("/stats", authenticate, requireAdmin, dashboardController.statsHandler);
router.get("/overview", authenticate, requireAdmin, dashboardController.overviewHandler);

export default router;
