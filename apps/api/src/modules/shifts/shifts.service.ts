import { prisma } from "@19er/db";
import type { Prisma } from "@19er/db";
import { BadRequestError, ConflictError, NotFoundError, buildDateRangeWhere, parsePagination, parseSortOrder, shiftsOverlap } from "@19er/shared";
import { parseListDateRange } from "../../shared/list-query.js";
import type { z } from "zod";
import type { assignShiftSchema, createShiftSchema, updateShiftSchema } from "./shifts.validators.js";

type CreateShiftInput = z.infer<typeof createShiftSchema>;
type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
type AssignShiftInput = z.infer<typeof assignShiftSchema>;

async function assertEmployeeCanBeAssigned(
  shift: { id: string; startTime: Date; endTime: Date },
  employeeId: string,
) {
  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.role !== "EMPLOYEE") {
    throw new NotFoundError("Employee not found");
  }

  const existingAssignments = await prisma.shiftEmployee.findMany({
    where: { employeeId },
    include: { shift: true },
  });

  for (const assignment of existingAssignments) {
    if (assignment.shiftId === shift.id) {
      throw new ConflictError("Employee already assigned to this shift");
    }
    if (
      shiftsOverlap(
        shift.startTime,
        shift.endTime,
        assignment.shift.startTime,
        assignment.shift.endTime,
      )
    ) {
      throw new ConflictError("Employee has an overlapping shift assignment");
    }
  }
}

function normalizeShiftListQuery(query: {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
  employeeId?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const sortFieldAliases: Record<string, string> = {
    title: "title",
    start: "startTime",
    startTime: "startTime",
    end: "endTime",
    endTime: "endTime",
    status: "status",
  };

  return {
    ...query,
    ...parseListDateRange(query),
    sort_field: query.sort_field ? (sortFieldAliases[query.sort_field] ?? query.sort_field) : undefined,
  };
}

export async function listShifts(query: {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
  employeeId?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const normalized = normalizeShiftListQuery(query);
  const { page, limit, skip } = parsePagination(normalized.page, normalized.limit);
  const where: Record<string, unknown> = {};

  if (normalized.search) {
    where.OR = [
      { title: { contains: normalized.search, mode: "insensitive" } },
      { notes: { contains: normalized.search, mode: "insensitive" } },
      {
        employees: {
          some: {
            employee: { fullName: { contains: normalized.search, mode: "insensitive" } },
          },
        },
      },
    ];
  }
  if (normalized.status) where.status = normalized.status;
  if (normalized.employeeId) {
    where.employees = { some: { employeeId: normalized.employeeId } };
  }

  const startTimeRange = (() => {
    try {
      return buildDateRangeWhere("startTime", normalized.fromDate, normalized.toDate);
    } catch (err) {
      throw new BadRequestError(err instanceof Error ? err.message : "Invalid date range");
    }
  })();
  if (startTimeRange) where.startTime = startTimeRange.startTime;

  const orderBy = parseSortOrder(
    normalized.sort_field,
    normalized.sort_order,
    {
      title: { title: "asc" },
      startTime: { startTime: "asc" },
      endTime: { endTime: "asc" },
      status: { status: "asc" },
    },
    { startTime: "asc" },
  ) as Prisma.ShiftOrderByWithRelationInput;

  const [items, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        employees: {
          include: {
            employee: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.shift.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getShiftById(id: string) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      employees: {
        include: {
          employee: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      },
    },
  });
  if (!shift) throw new NotFoundError("Shift not found");
  return shift;
}

export async function createShift(createdById: string, input: CreateShiftInput) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (startTime >= endTime) {
    throw new BadRequestError("startTime must be before endTime");
  }

  const employeeIds = [...new Set(input.employeeIds ?? [])];
  for (const employeeId of employeeIds) {
    await assertEmployeeCanBeAssigned({ id: "", startTime, endTime }, employeeId);
  }

  return prisma.shift.create({
    data: {
      title: input.title,
      startTime,
      endTime,
      notes: input.notes,
      breakMinutes: input.breakMinutes ?? 0,
      status: input.status,
      createdById,
      ...(employeeIds.length > 0
        ? {
            employees: {
              create: employeeIds.map((employeeId) => ({ employeeId })),
            },
          }
        : {}),
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      employees: {
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });
}

export async function updateShift(id: string, input: UpdateShiftInput) {
  await getShiftById(id);

  const data: Record<string, unknown> = { ...input };
  if (input.startTime) data.startTime = new Date(input.startTime);
  if (input.endTime) data.endTime = new Date(input.endTime);

  return prisma.shift.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { id: true, fullName: true } },
      employees: {
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  });
}

export async function deleteShift(id: string) {
  await getShiftById(id);
  await prisma.shift.delete({ where: { id } });
}

export async function assignEmployee(input: AssignShiftInput) {
  const shift = await getShiftById(input.shiftId);
  await assertEmployeeCanBeAssigned(shift, input.employeeId);

  return prisma.shiftEmployee.create({
    data: {
      shiftId: input.shiftId,
      employeeId: input.employeeId,
    },
    include: {
      shift: true,
      employee: { select: { id: true, fullName: true, email: true } },
    },
  });
}

export async function unassignEmployee(input: AssignShiftInput) {
  const assignment = await prisma.shiftEmployee.findUnique({
    where: {
      shiftId_employeeId: {
        shiftId: input.shiftId,
        employeeId: input.employeeId,
      },
    },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");
  await prisma.shiftEmployee.delete({ where: { id: assignment.id } });
}

export async function listShiftEmployees(query: {
  page?: string;
  limit?: string;
  shiftId?: string;
  employeeId?: string;
}) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where: Record<string, unknown> = {};
  if (query.shiftId) where.shiftId = query.shiftId;
  if (query.employeeId) where.employeeId = query.employeeId;

  const [items, total] = await Promise.all([
    prisma.shiftEmployee.findMany({
      where,
      skip,
      take: limit,
      include: {
        shift: true,
        employee: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.shiftEmployee.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
