import { prisma } from "@19er/db";
import {
  BadRequestError,
  NotFoundError,
  calculateSalary,
  calculateWorkedHours,
  parseDateRange,
  parsePagination,
  parseSortOrder,
} from "@19er/shared";
import type { Prisma } from "@19er/db";
import type { z } from "zod";
import type { payPayrollSchema, payrollRunSchema } from "./payroll.validators.js";
import * as notificationsService from "../notifications/notifications.service.js";

type PayrollRunInput = z.infer<typeof payrollRunSchema>;
type PayPayrollInput = z.infer<typeof payPayrollSchema>;

export async function runPayroll(input: PayrollRunInput) {
  const { from, to } = parseDateRange(input.fromDate, input.toDate);

  const attendances = await prisma.attendance.findMany({
    where: {
      checkIn: { not: null },
      checkOut: { not: null },
      shift: {
        startTime: { gte: from, lte: to },
      },
    },
    include: {
      employee: true,
      shift: true,
    },
  });

  const hoursByEmployee = new Map<string, number>();

  for (const record of attendances) {
    if (!record.checkIn || !record.checkOut || record.status === "ABSENT") continue;
    const hours = calculateWorkedHours(
      record.checkIn,
      record.checkOut,
      record.shift.breakMinutes,
    );
    const current = hoursByEmployee.get(record.employeeId) ?? 0;
    hoursByEmployee.set(record.employeeId, current + hours);
  }

  const payrollRun = await prisma.payrollRun.create({
    data: { fromDate: from, toDate: to },
  });

  const payrolls = [];
  for (const [employeeId, totalHours] of hoursByEmployee) {
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) continue;

    const salary = calculateSalary(totalHours, employee.hourlyRate);
    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        fromDate: from,
        toDate: to,
        totalHours,
        hourlyRate: employee.hourlyRate,
        salary,
        payrollRunId: payrollRun.id,
      },
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
      },
    });
    payrolls.push(payroll);

    await notificationsService.createSalaryNotification(
      employeeId,
      salary,
      from,
      to,
    );
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
          employee: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });
  if (!run) throw new NotFoundError("Payroll run not found");
  return run;
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
      { employee: { fullName: { contains: query.search, mode: "insensitive" } } },
      { employee: { email: { contains: query.search, mode: "insensitive" } } },
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
  if (!payroll) throw new NotFoundError("Payroll not found");
  return payroll;
}

export async function markPayrollPaid(id: string, input: PayPayrollInput) {
  const payroll = await getPayrollById(id);
  if (payroll.isPaid) {
    throw new BadRequestError("Payroll already marked as paid");
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
