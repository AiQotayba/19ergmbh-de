import { HTTP_STATUS } from "../constants/index.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public messageKey: string,
    public params?: Record<string, string | number>,
  ) {
    super(messageKey);
    this.name = "AppError";
  }

  get code(): string {
    return this.messageKey;
  }
}

export class BadRequestError extends AppError {
  constructor(messageKey: string, params?: Record<string, string | number>) {
    super(HTTP_STATUS.BAD_REQUEST, messageKey, params);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(messageKey = "common.unauthorized", params?: Record<string, string | number>) {
    super(HTTP_STATUS.UNAUTHORIZED, messageKey, params);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(messageKey = "common.forbidden", params?: Record<string, string | number>) {
    super(HTTP_STATUS.FORBIDDEN, messageKey, params);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(messageKey = "common.not_found", params?: Record<string, string | number>) {
    super(HTTP_STATUS.NOT_FOUND, messageKey, params);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(messageKey: string, params?: Record<string, string | number>) {
    super(HTTP_STATUS.CONFLICT, messageKey, params);
    this.name = "ConflictError";
  }
}
