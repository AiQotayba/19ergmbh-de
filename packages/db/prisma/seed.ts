import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const dbRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(dbRoot, "../../.env"), override: true });
config({ path: resolve(dbRoot, ".env"), override: true });

/** 9 employees + 1 admin = 10 users total */
const EMPLOYEES: { fullName: string; hourlyRate: number }[] = [
  { fullName: "Anna Schmidt", hourlyRate: 18.5 },
  { fullName: "Thomas Müller", hourlyRate: 19.0 },
  { fullName: "Lisa Weber", hourlyRate: 17.5 },
  { fullName: "Michael Fischer", hourlyRate: 20.0 },
  { fullName: "Sarah Becker", hourlyRate: 18.0 },
  { fullName: "Daniel Wagner", hourlyRate: 21.5 },
  { fullName: "Julia Hoffmann", hourlyRate: 17.0 },
  { fullName: "Markus Schneider", hourlyRate: 22.0 },
  { fullName: "Laura Klein", hourlyRate: 16.5 },
];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

async function clearUserData() {
  const { prisma } = await import("../src/index.js");

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.payroll.deleteMany(),
    prisma.payrollRun.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.shiftEmployee.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("  Cleared all users and related data.");
}

async function main() {
  const { prisma, UserRole } = await import("../src/index.js");

  await clearUserData();

  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const employeePassword = await bcrypt.hash("Employee123!", 10);

  const admin = await prisma.user.create({
    data: {
      fullName: "Stefan Berger",
      email: "admin@19ergmbh.de",
      phone: "+4915110000000",
      password: adminPassword,
      role: UserRole.ADMIN,
      hourlyRate: 0,
      isActive: true,
    },
  });

  const employees = await prisma.$transaction(
    EMPLOYEES.map((employee, index) =>
      prisma.user.create({
        data: {
          fullName: employee.fullName,
          email: `${slugifyName(employee.fullName)}@19ergmbh.de`,
          phone: `+49151${String(10000001 + index).padStart(8, "0")}`,
          password: employeePassword,
          role: UserRole.EMPLOYEE,
          hourlyRate: employee.hourlyRate,
          isActive: true,
        },
      }),
    ),
  );

  console.log("Seed completed:");
  console.log(`  Users:     ${1 + employees.length} total (1 admin + ${employees.length} employees)`);
  console.log(`  Admin:     admin@19ergmbh.de / Admin123! (${admin.fullName})`);
  console.log(`  Employees: Employee123!`);
  console.log("  Sample logins:");
  for (const employee of employees.slice(0, 3)) {
    console.log(`    - ${employee.email} (${employee.fullName})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
