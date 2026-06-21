import { prisma } from "@19er/db";
import type { DashboardStats } from "@19er/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();

  const [
    totalEmployees,
    activeEmployees,
    totalShifts,
    upcomingShifts,
    pendingPayrolls,
    pendingNotifications,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.shift.count(),
    prisma.shift.count({ where: { startTime: { gte: now } } }),
    prisma.payroll.count({ where: { isPaid: false } }),
    prisma.notification.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    totalShifts,
    upcomingShifts,
    pendingPayrolls,
    pendingNotifications,
  };
}

export async function getDashboardOverview() {
  const stats = await getDashboardStats();
  const recentShifts = await prisma.shift.findMany({
    take: 5,
    orderBy: { startTime: "desc" },
    include: {
      employees: {
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  });
  const recentPayrolls = await prisma.payroll.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { id: true, fullName: true } } },
  });

  return { stats, recentShifts, recentPayrolls };
}

export async function getHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected", timestamp: new Date().toISOString() };
  } catch {
    return { status: "degraded", database: "disconnected", timestamp: new Date().toISOString() };
  }
}
