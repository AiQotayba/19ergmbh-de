import { HTTP_STATUS } from "../constants/index.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code?: string) {
    super(HTTP_STATUS.BAD_REQUEST, message, code);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code?: string) {
    super(HTTP_STATUS.UNAUTHORIZED, message, code);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code?: string) {
    super(HTTP_STATUS.FORBIDDEN, message, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code?: string) {
    super(HTTP_STATUS.NOT_FOUND, message, code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(HTTP_STATUS.CONFLICT, message, code);
    this.name = "ConflictError";
  }
}
