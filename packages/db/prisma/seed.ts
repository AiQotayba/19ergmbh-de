import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const dbRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(dbRoot, "../../.env"), override: true });
config({ path: resolve(dbRoot, ".env"), override: true });

async function main() {
  const { prisma, UserRole } = await import("../src/index.js");

  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const employeePassword = await bcrypt.hash("Employee123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@19ergmbh.de" },
    update: {},
    create: {
      fullName: "Max Mustermann",
      email: "admin@19ergmbh.de",
      phone: "+4915112345678",
      password: adminPassword,
      role: UserRole.ADMIN,
      hourlyRate: 0,
      isActive: true,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "anna.schmidt@19ergmbh.de" },
    update: {},
    create: {
      fullName: "Anna Schmidt",
      email: "anna.schmidt@19ergmbh.de",
      phone: "+4915198765432",
      password: employeePassword,
      role: UserRole.EMPLOYEE,
      hourlyRate: 18.5,
      isActive: true,
    },
  });

  const existingShift = await prisma.shiftEmployee.findFirst({
    where: { employeeId: employee.id },
  });

  if (!existingShift) {
    const shiftStart = new Date();
    shiftStart.setHours(9, 0, 0, 0);
    const shiftEnd = new Date();
    shiftEnd.setHours(17, 0, 0, 0);

    const shift = await prisma.shift.create({
      data: {
        title: "Morning Shift",
        startTime: shiftStart,
        endTime: shiftEnd,
        breakMinutes: 30,
        createdById: admin.id,
        employees: {
          create: {
            employeeId: employee.id,
          },
        },
      },
    });

    console.log(`  Shift ID: ${shift.id}`);
  }

  console.log("Seed completed:");
  console.log(`  Admin:    admin@19ergmbh.de / Admin123!`);
  console.log(`  Employee: anna.schmidt@19ergmbh.de / Employee123!`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
