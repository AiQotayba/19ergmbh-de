import { prisma } from "@19er/db";
import type { Prisma } from "@19er/db";
import { hashPassword } from "@19er/auth";
import { ConflictError, NotFoundError, parsePagination } from "@19er/shared";
import { parseSortOrder } from "../../shared/list-query.js";
import { icontains } from "../../utils/prisma-search.js";
import type { z } from "zod";
import type { createUserSchema, updateUserSchema } from "./users.validators.js";

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

function parseUserStatusFilter(value?: string): "true" | "false" | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "active") return "true";
  if (normalized === "false" || normalized === "inactive") return "false";
  return undefined;
}

function normalizeUserListQuery(query: {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  isActive?: string;
  status?: string;
  assignment?: string;
  shiftId?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const sortFieldAliases: Record<string, string> = {
    name: "fullName",
    fullName: "fullName",
    email: "email",
    hourlyRate: "hourlyRate",
    role: "role",
    status: "isActive",
    isActive: "isActive",
  };

  const statusFilter = parseUserStatusFilter(query.status ?? query.isActive);

  return {
    page: query.page,
    limit: query.limit,
    search: query.search,
    role: query.role,
    isActive: statusFilter,
    assignment: query.assignment,
    shiftId: query.shiftId,
    sort_field: query.sort_field ? (sortFieldAliases[query.sort_field] ?? query.sort_field) : undefined,
    sort_order: query.sort_order,
  };
}

export async function listUsers(query: {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  isActive?: string;
  status?: string;
  assignment?: string;
  shiftId?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const normalized = normalizeUserListQuery(query);
  const { page, limit, skip } = parsePagination(normalized.page, normalized.limit);
  const where: Record<string, unknown> = {};

  if (normalized.search) {
    where.OR = [
      { fullName: icontains(normalized.search) },
      { email: icontains(normalized.search) },
      { phone: icontains(normalized.search) },
    ];
  }
  if (normalized.role) where.role = normalized.role;
  if (normalized.isActive === "true" || normalized.isActive === "false") {
    where.isActive = normalized.isActive === "true";
  }
  if (normalized.assignment === "unassigned") {
    where.shiftEmployees = { none: {} };
  } else if (normalized.assignment === "assigned") {
    where.shiftEmployees = { some: {} };
  } else if (normalized.assignment === "shift" && normalized.shiftId) {
    where.shiftEmployees = { some: { shiftId: normalized.shiftId } };
  }

  const orderBy = parseSortOrder(
    normalized.sort_field,
    normalized.sort_order,
    {
      fullName: { fullName: "asc" },
      email: { email: "asc" },
      hourlyRate: { hourlyRate: "asc" },
      role: { role: "asc" },
      isActive: { isActive: "asc" },
    },
    { createdAt: "desc" },
  ) as Prisma.UserOrderByWithRelationInput;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        hourlyRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      hourlyRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing) throw new ConflictError("Email or phone already in use");

  const password = await hashPassword(input.password);
  return prisma.user.create({
    data: { ...input, password },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      hourlyRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  await getUserById(id);

  if (input.email || input.phone) {
    const orConditions: Array<{ email?: string; phone?: string }> = [];
    if (input.email) orConditions.push({ email: input.email });
    if (input.phone) orConditions.push({ phone: input.phone });

    const existing = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: orConditions,
      },
    });
    if (existing) throw new ConflictError("Email or phone already in use");
  }

  const data: Record<string, unknown> = { ...input };
  if (input.password) {
    data.password = await hashPassword(input.password);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      hourlyRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteUser(id: string) {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
}
