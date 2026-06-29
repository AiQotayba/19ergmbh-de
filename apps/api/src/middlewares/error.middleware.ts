import type { NextFunction, Request, Response } from "express";
import { parseAcceptLanguage, translate, type Locale } from "@19er/i18n";
import { Prisma } from "@19er/db";
import { AppError } from "@19er/shared";
import { ZodError } from "zod";

export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.locale = parseAcceptLanguage(req.headers["accept-language"]);
  next();
}

export function getRequestLocale(req: Request): Locale {
  return req.locale ?? parseAcceptLanguage(req.headers["accept-language"]);
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const locale = getRequestLocale(req);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: translate(locale, err.messageKey, err.params),
      code: err.messageKey,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: translate(locale, "common.validation_failed"),
      code: "common.validation_failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: translate(locale, "common.resource_not_found"),
        code: "common.resource_not_found",
      });
      return;
    }

    if (err.code === "P2003") {
      res.status(409).json({
        success: false,
        error: translate(locale, "common.cannot_delete_related"),
        code: "common.cannot_delete_related",
      });
      return;
    }
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: translate(locale, "common.internal_error"),
    code: "common.internal_error",
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const locale = getRequestLocale(req);
  res.status(404).json({
    success: false,
    error: translate(locale, "common.route_not_found"),
    code: "common.route_not_found",
  });
}

declare global {
  namespace Express {
    interface Request {
      locale?: Locale;
    }
  }
}
