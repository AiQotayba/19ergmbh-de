import { Router } from "express";
import { authenticate, requireAdmin } from "@19er/auth";
import * as usersController from "./users.controller.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", usersController.listUsersHandler);
router.post("/", usersController.createUserHandler);
router.get("/:id", usersController.getUserHandler);
router.put("/:id", usersController.updateUserHandler);
router.delete("/:id", usersController.deleteUserHandler);

export default router;
