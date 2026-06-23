import { prisma } from "@19er/db";
import type { Prisma } from "@19er/db";
import { BadRequestError, ForbiddenError, NotFoundError, buildDateRangeWhere, parsePagination, parseSortOrder } from "@19er/shared";
import { parseListDateRange } from "../../shared/list-query.js";
import { icontains } from "../../utils/prisma-search.js";
import type { z } from "zod";
import type { checkInSchema, checkOutSchema, markAbsentSchema, markHolidaySchema } from "./attendance.validators.js";

type CheckInInput = z.infer<typeof checkInSchema>;
type CheckOutInput = z.infer<typeof checkOutSchema>;
type MarkAbsentInput = z.infer<typeof markAbsentSchema>;
type MarkHolidayInput = z.infer<typeof markHolidaySchema>;

async function ensureAssignment(shiftId: string, employeeId: string) {
  const assignment = await prisma.shiftEmployee.findUnique({
    where: { shiftId_employeeId: { shiftId, employeeId } },
  });
  if (!assignment) {
    throw new ForbiddenError("Employee is not assigned to this shift");
  }
}

export async function checkIn(
  requesterId: string,
  requesterRole: string,
  input: CheckInInput,
) {
  const employeeId = input.employeeId ?? requesterId;
  if (requesterRole === "EMPLOYEE" && employeeId !== requesterId) {
    throw new ForbiddenError("Cannot check in for another employee");
  }

  await ensureAssignment(input.shiftId, employeeId);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_shiftId: { employeeId, shiftId: input.shiftId } },
  });
  if (existing?.checkIn) {
    throw new BadRequestError("Already checked in for this shift");
  }

  const now = new Date();
  const shift = await prisma.shift.findUnique({ where: { id: input.shiftId } });
  if (!shift) throw new NotFoundError("Shift not found");

  const isLate = now > shift.startTime;

  async function confirmAssignment() {
    await prisma.shiftEmployee.update({
      where: {
        shiftId_employeeId: { shiftId: input.shiftId, employeeId },
      },
      data: { status: "CONFIRMED" },
    });
  }

  if (existing) {
    await confirmAssignment();
    return prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: now,
        status: isLate ? "LATE" : "PRESENT",
        notes: input.notes,
      },
      include: {
        shift: true,
        employee: { select: { id: true, fullName: true } },
      },
    });
  }

  await confirmAssignment();

  return prisma.attendance.create({
    data: {
      employeeId,
      shiftId: input.shiftId,
      checkIn: now,
      status: isLate ? "LATE" : "PRESENT",
      notes: input.notes,
    },
    include: {
      shift: true,
      employee: { select: { id: true, fullName: true } },
    },
  });
}

export async function checkOut(
  requesterId: string,
  requesterRole: string,
  input: CheckOutInput,
) {
  const employeeId = input.employeeId ?? requesterId;
  if (requesterRole === "EMPLOYEE" && employeeId !== requesterId) {
    throw new ForbiddenError("Cannot check out for another employee");
  }

  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_shiftId: { employeeId, shiftId: input.shiftId } },
    include: { shift: true },
  });
  if (!attendance?.checkIn) {
    throw new BadRequestError("Must check in before checking out");
  }
  if (attendance.checkOut) {
    throw new BadRequestError("Already checked out for this shift");
  }

  return prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOut: new Date(),
      notes: input.notes ?? attendance.notes,
    },
    include: {
      shift: true,
      employee: { select: { id: true, fullName: true } },
    },
  });
}

export async function markAbsent(input: MarkAbsentInput) {
  await ensureAssignment(input.shiftId, input.employeeId);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_shiftId: { employeeId: input.employeeId, shiftId: input.shiftId } },
  });

  await prisma.shiftEmployee.update({
    where: {
      shiftId_employeeId: { shiftId: input.shiftId, employeeId: input.employeeId },
    },
    data: { status: "ABSENT" },
  });

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { status: "ABSENT", notes: input.notes },
      include: {
        shift: true,
        employee: { select: { id: true, fullName: true } },
      },
    });
  }

  return prisma.attendance.create({
    data: {
      employeeId: input.employeeId,
      shiftId: input.shiftId,
      status: "ABSENT",
      notes: input.notes,
    },
    include: {
      shift: true,
      employee: { select: { id: true, fullName: true } },
    },
  });
}

export async function markHoliday(input: MarkHolidayInput) {
  await ensureAssignment(input.shiftId, input.employeeId);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_shiftId: { employeeId: input.employeeId, shiftId: input.shiftId } },
  });

  await prisma.shiftEmployee.update({
    where: {
      shiftId_employeeId: { shiftId: input.shiftId, employeeId: input.employeeId },
    },
    data: { status: "HOLIDAY" },
  });

  if (existing) {
    return prisma.attendance.delete({
      where: { id: existing.id },
    });
  }

  return { shiftId: input.shiftId, employeeId: input.employeeId, status: "HOLIDAY" as const };
}

function normalizeAttendanceListQuery(query: {
  page?: string;
  limit?: string;
  search?: string;
  employeeId?: string;
  shiftId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const sortFieldAliases: Record<string, string> = {
    employee: "employee",
    date: "date",
    checkin: "checkIn",
    checkIn: "checkIn",
    checkout: "checkOut",
    checkOut: "checkOut",
  };

  return {
    ...query,
    ...parseListDateRange(query),
    sort_field: query.sort_field ? (sortFieldAliases[query.sort_field] ?? query.sort_field) : undefined,
  };
}

export async function listAttendance(query: {
  page?: string;
  limit?: string;
  search?: string;
  employeeId?: string;
  shiftId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const normalized = normalizeAttendanceListQuery(query);
  const { page, limit, skip } = parsePagination(normalized.page, normalized.limit);
  const where: Record<string, unknown> = {};

  if (normalized.search) {
    where.OR = [
      { notes: icontains(normalized.search) },
      { employee: { fullName: icontains(normalized.search) } },
      { employee: { email: icontains(normalized.search) } },
      { shift: { title: icontains(normalized.search) } },
    ];
  }
  if (normalized.employeeId) where.employeeId = normalized.employeeId;
  if (normalized.shiftId) where.shiftId = normalized.shiftId;
  if (normalized.status) where.status = normalized.status;

  const shiftStartRange = (() => {
    try {
      return buildDateRangeWhere("startTime", normalized.fromDate, normalized.toDate);
    } catch (err) {
      throw new BadRequestError(err instanceof Error ? err.message : "Invalid date range");
    }
  })();
  if (shiftStartRange) {
    where.shift = { startTime: shiftStartRange.startTime };
  }

  const orderBy = parseSortOrder(
    normalized.sort_field,
    normalized.sort_order,
    {
      employee: { employee: { fullName: "asc" } },
      date: { shift: { startTime: "asc" } },
      checkIn: { checkIn: "asc" },
      checkOut: { checkOut: "asc" },
    },
    { shift: { startTime: "desc" } },
  ) as Prisma.AttendanceOrderByWithRelationInput;

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        shift: true,
        employee: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
