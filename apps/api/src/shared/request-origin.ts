import type { Request } from "express";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function getRequestOrigin(req: Request): string | null {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) {
    return normalizeOrigin(origin);
  }

  const referer = req.headers.referer;
  if (typeof referer === "string" && referer.length > 0) {
    try {
      return normalizeOrigin(new URL(referer).origin);
    } catch {
      return null;
    }
  }

  return null;
}

export function isAdminPortalRequest(req: Request, adminOrigins: readonly string[]): boolean {
  if (adminOrigins.length === 0) return false;

  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) return false;

  return adminOrigins.some((origin) => normalizeOrigin(origin) === requestOrigin);
}
