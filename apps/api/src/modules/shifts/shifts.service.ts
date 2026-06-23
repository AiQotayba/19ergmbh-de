import { prisma } from "@19er/db";
import type { Prisma } from "@19er/db";
import { BadRequestError, ConflictError, NotFoundError, deriveRosterStatus, parsePagination, parseSortOrder } from "@19er/shared";
import { parseListDateRange } from "../../shared/list-query.js";
import type { z } from "zod";
import type { assignShiftSchema, createShiftSchema, createShiftsBulkSchema, updateShiftSchema } from "./shifts.validators.js";
import {
  parseDateOnly,
  resolveShiftSchedule,
  resolveShiftScheduleFromInput,
  shiftSchedulesConflict,
  type ResolvedShiftSchedule,
} from "./shift-dates.js";

type CreateShiftInput = z.infer<typeof createShiftSchema>;
type CreateShiftsBulkInput = z.infer<typeof createShiftsBulkSchema>;
type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
type AssignShiftInput = z.infer<typeof assignShiftSchema>;

async function assertEmployeeCanBeAssigned(
  schedule: ResolvedShiftSchedule & { id: string },
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
    if (assignment.shiftId === schedule.id) {
      throw new ConflictError("Employee already assigned to this shift");
    }
    const existing = resolveShiftSchedule(assignment.shift);
    if (shiftSchedulesConflict(schedule, existing)) {
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
    start: "fromDate",
    fromDate: "fromDate",
    end: "toDate",
    toDate: "toDate",
    startTime: "fromDate",
    endTime: "toDate",
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

  if (normalized.fromDate || normalized.toDate) {
    const filterFrom = normalized.fromDate;
    const filterTo = normalized.toDate ?? normalized.fromDate;
    try {
      if (filterTo) {
        where.fromDate = { lte: parseDateOnly(filterTo) };
      }
      if (filterFrom) {
        where.toDate = { gte: parseDateOnly(filterFrom) };
      }
    } catch (err) {
      throw new BadRequestError(err instanceof Error ? err.message : "Invalid date range");
    }
  }

  const orderBy = parseSortOrder(
    normalized.sort_field,
    normalized.sort_order,
    {
      title: { title: "asc" },
      fromDate: { fromDate: "asc" },
      toDate: { toDate: "asc" },
      status: { status: "asc" },
    },
    { fromDate: "asc" },
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
  let schedule: ResolvedShiftSchedule;
  try {
    schedule = resolveShiftScheduleFromInput(input);
  } catch (err) {
    throw new BadRequestError(err instanceof Error ? err.message : "Invalid shift schedule");
  }

  const employeeIds = [...new Set(input.employeeIds ?? [])];
  for (const employeeId of employeeIds) {
    await assertEmployeeCanBeAssigned({ id: "", ...schedule }, employeeId);
  }

  return prisma.shift.create({
    data: {
      title: input.title,
      fromDate: parseDateOnly(schedule.fromDate),
      toDate: parseDateOnly(schedule.toDate),
      dailyStartTime: schedule.dailyStartTime,
      dailyEndTime: schedule.dailyEndTime,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
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

export async function createShiftsBulk(createdById: string, input: CreateShiftsBulkInput) {
  const shift = await createShift(createdById, input);
  return { item: shift, items: [shift], count: 1 };
}

export async function updateShift(id: string, input: UpdateShiftInput) {
  const existing = await getShiftById(id);
  const current = resolveShiftSchedule(existing);

  let schedule: ResolvedShiftSchedule;
  try {
    schedule = resolveShiftScheduleFromInput({
      fromDate: input.fromDate ?? current.fromDate,
      toDate: input.toDate ?? current.toDate,
      dailyStartTime: input.dailyStartTime ?? current.dailyStartTime,
      dailyEndTime: input.dailyEndTime ?? current.dailyEndTime,
    });
  } catch (err) {
    throw new BadRequestError(err instanceof Error ? err.message : "Invalid shift schedule");
  }

  const data: Prisma.ShiftUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.breakMinutes !== undefined ? { breakMinutes: input.breakMinutes } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    fromDate: parseDateOnly(schedule.fromDate),
    toDate: parseDateOnly(schedule.toDate),
    dailyStartTime: schedule.dailyStartTime,
    dailyEndTime: schedule.dailyEndTime,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
  };

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
  await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { shiftId: id } }),
    prisma.shift.delete({ where: { id } }),
  ]);
}

export async function assignEmployee(input: AssignShiftInput) {
  const shift = await getShiftById(input.shiftId);
  const schedule = resolveShiftSchedule(shift);
  await assertEmployeeCanBeAssigned({ id: shift.id, ...schedule }, input.employeeId);

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

export async function listShiftCandidates(query: {
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: string;
  limit?: string;
}) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where: Prisma.UserWhereInput = {
    role: "EMPLOYEE",
    isActive: true,
  };

  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  let shiftDateFilter: Prisma.ShiftWhereInput | undefined;
  if (query.fromDate || query.toDate) {
    const filterFrom = query.fromDate;
    const filterTo = query.toDate ?? query.fromDate;
    try {
      shiftDateFilter = {
        ...(filterTo ? { fromDate: { lte: parseDateOnly(filterTo) } } : {}),
        ...(filterFrom ? { toDate: { gte: parseDateOnly(filterFrom) } } : {}),
      };
    } catch (err) {
      throw new BadRequestError(err instanceof Error ? err.message : "Invalid date range");
    }
  }

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        shiftEmployees: {
          where: shiftDateFilter ? { shift: shiftDateFilter } : undefined,
          include: {
            shift: {
              select: {
                id: true,
                title: true,
                fromDate: true,
                toDate: true,
                dailyStartTime: true,
                dailyEndTime: true,
                startTime: true,
                endTime: true,
              },
            },
          },
          orderBy: { shift: { fromDate: "asc" } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items = employees.map((employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    shifts: employee.shiftEmployees.map((assignment) => assignment.shift),
  }));

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

function normalizeShiftEmployeeListQuery(query: {
  page?: string;
  limit?: string;
  shiftId?: string;
  employeeId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
  attendanceStatus?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const sortFieldAliases: Record<string, string> = {
    employee: "employee",
    date: "date",
    status: "status",
    attendanceStatus: "status",
  };

  return {
    ...query,
    ...parseListDateRange(query),
    sort_field: query.sort_field ? (sortFieldAliases[query.sort_field] ?? query.sort_field) : undefined,
  };
}

function buildShiftOverlapWhere(fromDate?: string, toDate?: string): Prisma.ShiftWhereInput {
  const shiftWhere: Prisma.ShiftWhereInput = {};
  if (!fromDate && !toDate) return shiftWhere;

  const filterFrom = fromDate;
  const filterTo = toDate ?? fromDate;
  try {
    if (filterTo) {
      shiftWhere.fromDate = { lte: parseDateOnly(filterTo) };
    }
    if (filterFrom) {
      shiftWhere.toDate = { gte: parseDateOnly(filterFrom) };
    }
  } catch (err) {
    throw new BadRequestError(err instanceof Error ? err.message : "Invalid date range");
  }
  return shiftWhere;
}

function deriveAttendanceStatus(
  assignment: { status: string; shift: { endTime: Date } },
  attendance: { status: string; checkIn: Date | null } | null | undefined,
): string {
  return deriveRosterStatus({
    assignmentStatus: assignment.status,
    attendance,
    shift: assignment.shift,
  });
}

async function buildAttendanceStatusFilter(
  attendanceStatus: string | undefined,
  shiftWhere: Prisma.ShiftWhereInput,
): Promise<Prisma.ShiftEmployeeWhereInput | undefined> {
  if (!attendanceStatus) return undefined;

  const now = new Date();

  if (attendanceStatus === "HOLIDAY") {
    return { status: "HOLIDAY" };
  }

  if (attendanceStatus === "ABSENT") {
    const pairs = await prisma.attendance.findMany({
      where: { status: "ABSENT", shift: shiftWhere },
      select: { shiftId: true, employeeId: true },
    });
    return {
      OR: [
        { status: "ABSENT" },
        ...pairs.map((pair) => ({ shiftId: pair.shiftId, employeeId: pair.employeeId })),
      ],
    };
  }

  if (attendanceStatus === "PRESENT" || attendanceStatus === "LATE") {
    const pairs = await prisma.attendance.findMany({
      where: { status: attendanceStatus, shift: shiftWhere },
      select: { shiftId: true, employeeId: true },
    });
    if (pairs.length === 0) {
      return { id: "__no_match__" };
    }
    return {
      OR: pairs.map((pair) => ({ shiftId: pair.shiftId, employeeId: pair.employeeId })),
    };
  }

  if (attendanceStatus === "ON_DUTY") {
    const attendancePairs = await prisma.attendance.findMany({
      where: {
        shift: shiftWhere,
        OR: [{ status: "ABSENT" }, { checkIn: { not: null } }],
      },
      select: { shiftId: true, employeeId: true },
    });
    const exclude = attendancePairs.map((pair) => ({
      shiftId: pair.shiftId,
      employeeId: pair.employeeId,
    }));
    return {
      AND: [
        { status: { notIn: ["ABSENT", "HOLIDAY"] } },
        { shift: { endTime: { lt: now }, ...shiftWhere } },
        ...(exclude.length > 0
          ? [{ NOT: { OR: exclude } }]
          : []),
      ],
    };
  }

  if (attendanceStatus === "SCHEDULED") {
    return {
      AND: [
        { status: { notIn: ["ABSENT", "HOLIDAY"] } },
        { shift: { endTime: { gte: now }, ...shiftWhere } },
      ],
    };
  }

  return undefined;
}

export async function listShiftEmployees(query: {
  page?: string;
  limit?: string;
  shiftId?: string;
  employeeId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
  attendanceStatus?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const normalized = normalizeShiftEmployeeListQuery(query);
  const { page, limit, skip } = parsePagination(normalized.page, normalized.limit);
  const where: Prisma.ShiftEmployeeWhereInput = {};

  if (normalized.shiftId) where.shiftId = normalized.shiftId;
  if (normalized.employeeId) where.employeeId = normalized.employeeId;

  if (normalized.search) {
    where.OR = [
      { employee: { fullName: { contains: normalized.search, mode: "insensitive" } } },
      { employee: { email: { contains: normalized.search, mode: "insensitive" } } },
      { shift: { title: { contains: normalized.search, mode: "insensitive" } } },
    ];
  }

  const shiftOverlap = buildShiftOverlapWhere(normalized.fromDate, normalized.toDate);
  if (Object.keys(shiftOverlap).length > 0) {
    where.shift = shiftOverlap;
  }

  const statusFilter = await buildAttendanceStatusFilter(normalized.attendanceStatus, shiftOverlap);
  if (statusFilter) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), statusFilter];
  }

  const orderBy = parseSortOrder(
    normalized.sort_field,
    normalized.sort_order,
    {
      employee: { employee: { fullName: "asc" } },
      date: { shift: { fromDate: "asc" } },
      status: { status: "asc" },
    },
    { shift: { fromDate: "desc" } },
  ) as Prisma.ShiftEmployeeOrderByWithRelationInput;

  const [assignments, total] = await Promise.all([
    prisma.shiftEmployee.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        shift: true,
        employee: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    }),
    prisma.shiftEmployee.count({ where }),
  ]);

  const attendanceRecords =
    assignments.length > 0
      ? await prisma.attendance.findMany({
          where: {
            OR: assignments.map((assignment) => ({
              shiftId: assignment.shiftId,
              employeeId: assignment.employeeId,
            })),
          },
        })
      : [];

  const attendanceByKey = new Map(
    attendanceRecords.map((record) => [`${record.shiftId}:${record.employeeId}`, record]),
  );

  const items = assignments.map((assignment) => {
    const attendance = attendanceByKey.get(`${assignment.shiftId}:${assignment.employeeId}`) ?? null;
    return {
      ...assignment,
      attendance,
      attendanceStatus: deriveAttendanceStatus(assignment, attendance),
    };
  });

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
