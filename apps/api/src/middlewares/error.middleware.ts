import type { NextFunction, Request, Response } from "express";
import { AppError } from "@19er/shared";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
}
