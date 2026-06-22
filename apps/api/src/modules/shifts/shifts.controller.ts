import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import { paramId } from "../../shared/params.js";
import * as shiftsService from "./shifts.service.js";
import {
  assignShiftSchema,
  createShiftSchema,
  createShiftsBulkSchema,
  listShiftCandidatesSchema,
  unassignShiftSchema,
  updateShiftSchema,
} from "./shifts.validators.js";

export async function listShiftsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await shiftsService.listShifts(req.query as Record<string, string>);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getShiftHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shift = await shiftsService.getShiftById(paramId(req.params));
    sendSuccess(res, shift);
  } catch (err) {
    next(err);
  }
}

export async function createShiftHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createShiftSchema.parse(req.body);
    const shift = await shiftsService.createShift(req.user!.sub, input);
    sendSuccess(res, shift, 201);
  } catch (err) {
    next(err);
  }
}

export async function createShiftsBulkHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createShiftsBulkSchema.parse(req.body);
    const result = await shiftsService.createShiftsBulk(req.user!.sub, input);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateShiftHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateShiftSchema.parse(req.body);
    const shift = await shiftsService.updateShift(paramId(req.params), input);
    sendSuccess(res, shift);
  } catch (err) {
    next(err);
  }
}

export async function deleteShiftHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await shiftsService.deleteShift(paramId(req.params));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function assignHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = assignShiftSchema.parse(req.body);
    const assignment = await shiftsService.assignEmployee(input);
    sendSuccess(res, assignment, 201);
  } catch (err) {
    next(err);
  }
}

export async function unassignHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = unassignShiftSchema.parse(req.body);
    await shiftsService.unassignEmployee(input);
    sendSuccess(res, { unassigned: true });
  } catch (err) {
    next(err);
  }
}

export async function listShiftCandidatesHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listShiftCandidatesSchema.parse(req.query);
    const result = await shiftsService.listShiftCandidates(query);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listShiftEmployeesHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await shiftsService.listShiftEmployees(req.query as Record<string, string>);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
