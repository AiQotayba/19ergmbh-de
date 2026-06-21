import { Router } from "express";
import { authenticate } from "@19er/auth";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/register", authController.registerHandler);
router.post("/login", authController.loginHandler);
router.post("/refresh", authController.refreshHandler);
router.post("/logout", authController.logoutHandler);
router.put("/change-password", authenticate, authController.changePasswordHandler);

export default router;
