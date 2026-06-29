import { prisma } from "@19er/db";
import type { Prisma } from "@19er/db";
import {
  BadRequestError,
  NotFoundError,
  computeEmployeePayrollTotals,
  parseDateRange,
  parsePagination,
  parseSortOrder,
  type PayrollAssignmentInput,
} from "@19er/shared";
import { icontains } from "../../utils/prisma-search.js";
import type { z } from "zod";
import type { payPayrollSchema, payrollPreviewSchema, payrollRunSchema } from "./payroll.validators.js";

type PayrollRunInput = z.infer<typeof payrollRunSchema>;
type PayrollPreviewInput = z.infer<typeof payrollPreviewSchema>;
type PayPayrollInput = z.infer<typeof payPayrollSchema>;

export type PayrollPreviewLine = {
  employeeId: string;
  employee: { id: string; fullName: string; email: string; hourlyRate: number };
  workedHours: number;
  absenceHours: number;
  scheduledHours: number;
  hourlyRate: number;
  salary: number;
};

async function loadPayrollAssignments(from: Date, to: Date, employeeId?: string) {
  const assignments = await prisma.shiftEmployee.findMany({
    where: {
      ...(employeeId ? { employeeId } : {}),
      employee: { role: "EMPLOYEE", isActive: true },
      shift: {
        fromDate: { lte: to },
        toDate: { gte: from },
      },
    },
    include: {
      shift: true,
      employee: { select: { id: true, fullName: true, email: true, hourlyRate: true } },
    },
  });

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

  return { assignments, attendanceByKey };
}

function toAssignmentInput(
  assignment: Awaited<ReturnType<typeof loadPayrollAssignments>>["assignments"][number],
  attendanceByKey: Map<string, { status: string; checkIn: Date | null; checkOut: Date | null }>,
): PayrollAssignmentInput {
  const attendance = attendanceByKey.get(`${assignment.shiftId}:${assignment.employeeId}`) ?? null;
  return {
    employeeId: assignment.employeeId,
    assignmentStatus: assignment.status,
    shift: {
      fromDate: assignment.shift.fromDate,
      toDate: assignment.shift.toDate,
      dailyStartTime: assignment.shift.dailyStartTime,
      dailyEndTime: assignment.shift.dailyEndTime,
      breakMinutes: assignment.shift.breakMinutes,
      endTime: assignment.shift.endTime,
    },
    attendance: attendance
      ? {
          status: attendance.status,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
        }
      : null,
  };
}

async function buildPayrollPreview(
  from: Date,
  to: Date,
  employeeId?: string,
): Promise<PayrollPreviewLine[]> {
  const { assignments, attendanceByKey } = await loadPayrollAssignments(from, to, employeeId);

  const byEmployee = new Map<string, PayrollAssignmentInput[]>();
  const employeeMeta = new Map<
    string,
    { id: string; fullName: string; email: string; hourlyRate: number }
  >();

  for (const assignment of assignments) {
    const input = toAssignmentInput(assignment, attendanceByKey);
    const list = byEmployee.get(assignment.employeeId) ?? [];
    list.push(input);
    byEmployee.set(assignment.employeeId, list);
    employeeMeta.set(assignment.employeeId, assignment.employee);
  }

  if (employeeId && !employeeMeta.has(employeeId)) {
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, fullName: true, email: true, hourlyRate: true, role: true },
    });
    if (!employee || employee.role !== "EMPLOYEE") {
      throw new NotFoundError("employee.not_found");
    }
    const { role: _, ...employeeData } = employee;
    employeeMeta.set(employeeId, employeeData);
    byEmployee.set(employeeId, []);
  }

  const lines: PayrollPreviewLine[] = [];

  for (const [id, employee] of employeeMeta) {
    const totals = computeEmployeePayrollTotals(
      byEmployee.get(id) ?? [],
      from,
      to,
      employee.hourlyRate,
    );

    if (!employeeId && totals.workedHours === 0 && totals.absenceHours === 0) {
      continue;
    }

    lines.push({
      employeeId: id,
      employee,
      workedHours: totals.workedHours,
      absenceHours: totals.absenceHours,
      scheduledHours: totals.scheduledHours,
      hourlyRate: employee.hourlyRate,
      salary: totals.salary,
    });
  }

  return lines.sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
}

export async function previewPayroll(input: PayrollPreviewInput) {
  const { from, to } = parseDateRange(input.fromDate, input.toDate);
  const lines = await buildPayrollPreview(from, to, input.employeeId);
  return {
    fromDate: from,
    toDate: to,
    employeeId: input.employeeId ?? null,
    lines,
  };
}

export async function runPayroll(input: PayrollRunInput) {
  const { from, to } = parseDateRange(input.fromDate, input.toDate);
  const lines = await buildPayrollPreview(from, to, input.employeeId);

  if (lines.length === 0) {
    throw new BadRequestError("payroll.no_records");
  }

  const payrollRun = await prisma.payrollRun.create({
    data: { fromDate: from, toDate: to },
  });

  const payrolls = [];
  for (const line of lines) {
    const payroll = await prisma.payroll.create({
      data: {
        employeeId: line.employeeId,
        fromDate: from,
        toDate: to,
        totalHours: line.workedHours,
        absenceHours: line.absenceHours,
        hourlyRate: line.hourlyRate,
        salary: line.salary,
        payrollRunId: payrollRun.id,
      },
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
      },
    });
    payrolls.push(payroll);
  }

  return { payrollRun, payrolls };
}

export async function listPayrollRuns(query: {
  page?: string;
  limit?: string;
  search?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const orderBy = parseSortOrder(
    query.sort_field,
    query.sort_order,
    {
      fromDate: { fromDate: "asc" },
      toDate: { toDate: "asc" },
      createdAt: { createdAt: "asc" },
    },
    { createdAt: "desc" },
  ) as Prisma.PayrollRunOrderByWithRelationInput;

  const [items, total] = await Promise.all([
    prisma.payrollRun.findMany({
      skip,
      take: limit,
      orderBy,
      include: {
        _count: { select: { payrolls: true } },
        payrolls: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
    prisma.payrollRun.count(),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPayrollRunById(id: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payrolls: {
        include: {
          employee: { select: { id: true, fullName: true, email: true, phone: true } },
        },
        orderBy: { employee: { fullName: "asc" } },
      },
    },
  });
  if (!run) throw new NotFoundError("payroll.run_not_found");
  return run;
}

export async function deletePayrollRun(id: string) {
  await getPayrollRunById(id);
  await prisma.$transaction([
    prisma.payroll.deleteMany({ where: { payrollRunId: id } }),
    prisma.payrollRun.delete({ where: { id } }),
  ]);
  return { deleted: true };
}

export async function listPayrolls(query: {
  page?: string;
  limit?: string;
  search?: string;
  employeeId?: string;
  isPaid?: string;
  payrollRunId?: string;
  sort_field?: string;
  sort_order?: string;
}) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { employee: { fullName: icontains(query.search) } },
      { employee: { email: icontains(query.search) } },
    ];
  }
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.isPaid !== undefined) where.isPaid = query.isPaid === "true";
  if (query.payrollRunId) where.payrollRunId = query.payrollRunId;

  const orderBy = parseSortOrder(
    query.sort_field,
    query.sort_order,
    {
      employee: { employee: { fullName: "asc" } },
      fromDate: { fromDate: "asc" },
      totalHours: { totalHours: "asc" },
      absenceHours: { absenceHours: "asc" },
      salary: { salary: "asc" },
      isPaid: { isPaid: "asc" },
    },
    { createdAt: "desc" },
  ) as Prisma.PayrollOrderByWithRelationInput;

  const [items, total] = await Promise.all([
    prisma.payroll.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
        payrollRun: true,
      },
    }),
    prisma.payroll.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPayrollById(id: string) {
  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, email: true } },
      payrollRun: true,
    },
  });
  if (!payroll) throw new NotFoundError("payroll.not_found");
  return payroll;
}

export async function markPayrollPaid(id: string, input: PayPayrollInput) {
  const payroll = await getPayrollById(id);
  if (payroll.isPaid) {
    throw new BadRequestError("payroll.already_paid");
  }

  const paidAmount = input.paidAmount ?? payroll.salary;

  return prisma.payroll.update({
    where: { id },
    data: {
      isPaid: true,
      paidAmount,
      paidAt: new Date(),
    },
    include: {
      employee: { select: { id: true, fullName: true, email: true } },
    },
  });
}
