import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import { pickQueryParams } from "../../shared/http-query.js";
import { paramId } from "../../shared/params.js";
import * as usersService from "./users.service.js";
import { createUserSchema, updateUserSchema } from "./users.validators.js";

const USER_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "search",
  "role",
  "isActive",
  "status",
  "assignment",
  "shiftId",
  "sort_field",
  "sort_order",
] as const;

export async function listUsersHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await usersService.listUsers(
      pickQueryParams(req.query as Record<string, unknown>, [...USER_LIST_QUERY_KEYS]),
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await usersService.getUserById(paramId(req.params));
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await usersService.createUser(input);
    sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(paramId(req.params), input);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await usersService.deleteUser(paramId(req.params));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
