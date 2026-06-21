import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import { paramId } from "../../shared/params.js";
import * as payrollService from "./payroll.service.js";
import { payPayrollSchema, payrollRunSchema } from "./payroll.validators.js";

export async function runPayrollHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = payrollRunSchema.parse(req.body);
    const result = await payrollService.runPayroll(input);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function listPayrollRunsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await payrollService.listPayrollRuns(req.query as Record<string, string>);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getPayrollRunHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const run = await payrollService.getPayrollRunById(paramId(req.params));
    sendSuccess(res, run);
  } catch (err) {
    next(err);
  }
}

export async function listPayrollsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await payrollService.listPayrolls(req.query as Record<string, string>);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getPayrollHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payroll = await payrollService.getPayrollById(paramId(req.params));
    sendSuccess(res, payroll);
  } catch (err) {
    next(err);
  }
}

export async function markPaidHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = payPayrollSchema.parse(req.body);
    const payroll = await payrollService.markPayrollPaid(paramId(req.params), input);
    sendSuccess(res, payroll);
  } catch (err) {
    next(err);
  }
}
