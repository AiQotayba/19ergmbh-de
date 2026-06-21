/**
 * Integration tests mapped to docs/user-story.md (US-1 … US-29).
 * Complements auth.test.ts, users-shifts.test.ts, and me-dashboard.test.ts.
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  bearer,
  createShiftAndAssign,
  createTestEmployee,
  futureShiftTimes,
  getApp,
  login,
  loginAsAdmin,
  loginAsEmployee,
  payrollPeriodForShift,
  recordAttendanceForPayroll,
  SEED,
  uniquePhone,
  uniqueSuffix,
} from "./helpers.js";

// ─── 1. Auth & permissions ───────────────────────────────────────────────

describe("US-1: Login", () => {
  it("admin and employee can log in with role in response", async () => {
    const admin = await login(SEED.admin.email, SEED.admin.password);
    const employee = await login(SEED.employee.email, SEED.employee.password);

    expect(admin.user.role).toBe("ADMIN");
    expect(employee.user.role).toBe("EMPLOYEE");
  });
});

describe("US-2: Role management", () => {
  it("admin can assign EMPLOYEE role on create", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    const res = await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: "Role Test Employee",
        email: `role.${suffix}@19ergmbh.de`,
        phone: uniquePhone(),
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 15,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("EMPLOYEE");
  });

  it("admin can promote user to ADMIN via update", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);

    const res = await request(getApp())
      .put(`/admin/users/${employee.user.id}`)
      .set(bearer(admin.tokens.accessToken))
      .send({ role: "ADMIN" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("ADMIN");

    await request(getApp())
      .put(`/admin/users/${employee.user.id}`)
      .set(bearer(admin.tokens.accessToken))
      .send({ role: "EMPLOYEE" });
  });
});

// ─── 2. Employee management ──────────────────────────────────────────────

describe("US-3: Add employee", () => {
  it("admin creates employee with name, phone, email, hourly rate", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    const res = await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: "Hans Mueller",
        email: `hans.${suffix}@19ergmbh.de`,
        phone: uniquePhone(),
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 22.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.fullName).toBe("Hans Mueller");
    expect(res.body.data.hourlyRate).toBe(22.5);
  });
});

describe("US-4: Update or delete employee", () => {
  it("admin updates and deletes an employee", async () => {
    const admin = await loginAsAdmin();
    const created = await createTestEmployee(admin.tokens.accessToken);

    const update = await request(getApp())
      .put(`/admin/users/${created.user.id}`)
      .set(bearer(admin.tokens.accessToken))
      .send({ fullName: "Updated Name", hourlyRate: 25 });

    expect(update.status).toBe(200);
    expect(update.body.data.fullName).toBe("Updated Name");

    const del = await request(getApp())
      .delete(`/admin/users/${created.user.id}`)
      .set(bearer(admin.tokens.accessToken));

    expect(del.status).toBe(200);

    const get = await request(getApp())
      .get(`/admin/users/${created.user.id}`)
      .set(bearer(admin.tokens.accessToken));

    expect(get.status).toBe(404);
  });
});

describe("US-5: Search employee", () => {
  it("admin searches users by name", async () => {
    const admin = await loginAsAdmin();
    const suffix = uniqueSuffix();
    const name = `Searchable ${suffix}`;

    await request(getApp())
      .post("/admin/users")
      .set(bearer(admin.tokens.accessToken))
      .send({
        fullName: name,
        email: `search.${suffix}@19ergmbh.de`,
        phone: uniquePhone(),
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 18,
      });

    const res = await request(getApp())
      .get("/admin/users")
      .query({ search: suffix })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.some((u: { fullName: string }) => u.fullName.includes(suffix))).toBe(
      true,
    );
  });

  it("admin searches users by phone fragment", async () => {
    const admin = await loginAsAdmin();
    const phone = uniquePhone();

    await request(getApp())
      .post("/admin/users")
      .set(bearer(admin.tokens.accessToken))
      .send({
        fullName: "Phone Search",
        email: `phone.${uniqueSuffix()}@19ergmbh.de`,
        phone,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 18,
      });

    const fragment = phone.slice(-6);
    const res = await request(getApp())
      .get("/admin/users")
      .query({ search: fragment })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});

describe("US-6: Filter employees", () => {
  it("admin filters users by role and active status", async () => {
    const { tokens } = await loginAsAdmin();

    const employees = await request(getApp())
      .get("/admin/users")
      .query({ role: "EMPLOYEE", isActive: "true" })
      .set(bearer(tokens.accessToken));

    expect(employees.status).toBe(200);
    expect(employees.body.data.items.every((u: { role: string }) => u.role === "EMPLOYEE")).toBe(
      true,
    );

    const admins = await request(getApp())
      .get("/admin/users")
      .query({ role: "ADMIN" })
      .set(bearer(tokens.accessToken));

    expect(admins.status).toBe(200);
    expect(admins.body.data.items.every((u: { role: string }) => u.role === "ADMIN")).toBe(true);
  });
});

// ─── 3. Shifts ───────────────────────────────────────────────────────────

describe("US-7: Create shift", () => {
  it("admin creates shift with start and end time", async () => {
    const { tokens } = await loginAsAdmin();
    const times = futureShiftTimes(48);

    const res = await request(getApp())
      .post("/shifts")
      .set(bearer(tokens.accessToken))
      .send({ title: "US-7 Shift", ...times });

    expect(res.status).toBe(201);
    expect(res.body.data.startTime).toBe(times.startTime);
    expect(res.body.data.endTime).toBe(times.endTime);
  });
});

describe("US-8: Assign employees to shift", () => {
  it("admin assigns employee to shift", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      "US-8 Shift",
    );

    const list = await request(getApp())
      .get("/shifts/employees")
      .query({ shiftId: shift.id })
      .set(bearer(admin.tokens.accessToken));

    expect(list.status).toBe(200);
    expect(
      list.body.data.items.some(
        (a: { employeeId: string }) => a.employeeId === employee.user.id,
      ),
    ).toBe(true);
  });
});

describe("US-9: Search employee when assigning", () => {
  it("admin finds employee via search before assignment", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const search = employee.user.fullName.split(" ").pop()!;

    const found = await request(getApp())
      .get("/admin/users")
      .query({ search, role: "EMPLOYEE" })
      .set(bearer(admin.tokens.accessToken));

    expect(found.status).toBe(200);
    expect(found.body.data.items.some((u: { id: string }) => u.id === employee.user.id)).toBe(
      true,
    );
  });
});

describe("US-10: Prevent shift overlap", () => {
  it("returns 409 when assigning overlapping shift", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift: first, times } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
    );

    const overlapStart = new Date(times.startTime);
    overlapStart.setTime(overlapStart.getTime() + 2 * 3_600_000);
    const overlapEnd = new Date(times.endTime);
    overlapEnd.setTime(overlapEnd.getTime() + 2 * 3_600_000);

    const second = await request(getApp())
      .post("/shifts")
      .set(bearer(admin.tokens.accessToken))
      .send({
        title: "Overlap Shift",
        startTime: overlapStart.toISOString(),
        endTime: overlapEnd.toISOString(),
      });

    const conflict = await request(getApp())
      .post("/shifts/assign")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: second.body.data.id, employeeId: employee.user.id });

    expect(conflict.status).toBe(409);
    expect(first.id).toBeTruthy();
  });
});

describe("US-11: Calendar view", () => {
  it("admin lists all shifts with employees in date range", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { times } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      "Calendar Shift",
    );

    const res = await request(getApp())
      .get("/shifts")
      .query({ fromDate: times.startTime, toDate: times.endTime })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0].employees).toBeDefined();
  });

  it("admin gets dashboard overview with recent shifts", async () => {
    const { tokens } = await loginAsAdmin();

    const res = await request(getApp())
      .get("/dashboard/overview")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toBeDefined();
    expect(Array.isArray(res.body.data.recentShifts)).toBe(true);
  });
});

describe("US-12: Send schedule notifications", () => {
  it("admin sends schedule notifications for a shift", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      "Notify Shift",
    );

    const res = await request(getApp())
      .post("/notifications/send-schedule")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shift.id, channel: "EMAIL" });

    expect(res.status).toBe(201);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].type).toBe("SCHEDULE");
    expect(res.body.data[0].status).toBe("SENT");
  });
});

// ─── 4. Employee view ────────────────────────────────────────────────────

describe("US-13: Employee schedule", () => {
  it("employee sees assigned shifts via /me/shifts", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    await createShiftAndAssign(admin.tokens.accessToken, employee.user.id, "My Shift");

    const res = await request(getApp())
      .get("/me/shifts")
      .set(bearer(employee.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});

describe("US-14: Shift details", () => {
  it("employee views shift start and end time", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
    );

    const res = await request(getApp())
      .get(`/shifts/${shift.id}`)
      .set(bearer(employee.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.startTime).toBe(times.startTime);
    expect(res.body.data.endTime).toBe(times.endTime);
  });
});

// ─── 5. Attendance ───────────────────────────────────────────────────────

describe("US-15: Check-in / check-out", () => {
  it("records attendance via /attendance and /me endpoints", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);

    const checkIn = await request(getApp())
      .post("/me/check-in")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });

    expect(checkIn.status).toBe(201);

    const checkOut = await request(getApp())
      .post("/me/check-out")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });

    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.checkOut).toBeTruthy();
  });
});

describe("US-16: Mark absent", () => {
  it("admin marks employee absent for a shift", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);

    const res = await request(getApp())
      .post("/attendance/absent")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shift.id, employeeId: employee.user.id, notes: "Sick leave" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ABSENT");
  });
});

// ─── 6. Payroll ──────────────────────────────────────────────────────────

describe("US-17 & US-18: Payroll run and hours calculation", () => {
  it("calculates hours from attendance and creates payroll run", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);
    const period = payrollPeriodForShift(times);

    await recordAttendanceForPayroll(employee.tokens.accessToken, employee.user.id, shift.id);

    const run = await request(getApp())
      .post("/payroll/run")
      .set(bearer(admin.tokens.accessToken))
      .send(period);

    expect(run.status).toBe(201);
    const payroll = run.body.data.payrolls.find(
      (p: { employeeId: string }) => p.employeeId === employee.user.id,
    );
    expect(payroll).toBeDefined();
    expect(payroll.totalHours).toBeGreaterThan(0);
    expect(payroll.salary).toBeCloseTo(payroll.totalHours * payroll.hourlyRate, 2);
  });
});

describe("US-19: View payrolls", () => {
  it("admin lists and fetches payroll by id", async () => {
    const { tokens } = await loginAsAdmin();

    const list = await request(getApp())
      .get("/payroll")
      .set(bearer(tokens.accessToken));

    expect(list.status).toBe(200);

    if (list.body.data.items.length > 0) {
      const id = list.body.data.items[0].id;
      const one = await request(getApp())
        .get(`/payroll/${id}`)
        .set(bearer(tokens.accessToken));

      expect(one.status).toBe(200);
      expect(one.body.data.id).toBe(id);
    }
  });
});

describe("US-20: Excel export", () => {
  it.skip("not implemented in API MVP", () => {});
});

describe("US-21: Salary notification on payroll", () => {
  it("creates salary notification when payroll run completes", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);
    const period = payrollPeriodForShift(times);

    await recordAttendanceForPayroll(employee.tokens.accessToken, employee.user.id, shift.id);

    await request(getApp())
      .post("/payroll/run")
      .set(bearer(admin.tokens.accessToken))
      .send(period);

    const notifications = await request(getApp())
      .get("/notifications")
      .query({ type: "SALARY" })
      .set(bearer(employee.tokens.accessToken));

    expect(notifications.status).toBe(200);
    expect(
      notifications.body.data.items.some((n: { type: string }) => n.type === "SALARY"),
    ).toBe(true);
  });
});

// ─── 7. Notifications ────────────────────────────────────────────────────

describe("US-22: Schedule notification", () => {
  it("sends SCHEDULE notification to assigned employees", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);

    const res = await request(getApp())
      .post("/notifications/send-schedule")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shift.id });

    expect(res.status).toBe(201);
    expect(res.body.data[0].type).toBe("SCHEDULE");
  });
});

describe("US-23: Salary notification batch", () => {
  it("admin sends salary notifications for a payroll run", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);
    const period = payrollPeriodForShift(times);

    await recordAttendanceForPayroll(employee.tokens.accessToken, employee.user.id, shift.id);

    const run = await request(getApp())
      .post("/payroll/run")
      .set(bearer(admin.tokens.accessToken))
      .send(period);

    const notify = await request(getApp())
      .post("/notifications/send-salary")
      .set(bearer(admin.tokens.accessToken))
      .send({ payrollRunId: run.body.data.payrollRun.id, channel: "WHATSAPP" });

    expect(notify.status).toBe(201);
    expect(notify.body.data[0].channel).toBe("WHATSAPP");
  });
});

describe("US-24: Multi-channel notifications", () => {
  it("supports EMAIL and WHATSAPP channels", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);

    const email = await request(getApp())
      .post("/notifications")
      .set(bearer(admin.tokens.accessToken))
      .send({
        employeeId: employee.user.id,
        type: "SCHEDULE",
        channel: "EMAIL",
        title: "Email test",
        message: "Schedule via email",
      });

    const whatsapp = await request(getApp())
      .post("/notifications")
      .set(bearer(admin.tokens.accessToken))
      .send({
        employeeId: employee.user.id,
        type: "SALARY",
        channel: "WHATSAPP",
        title: "WhatsApp test",
        message: "Salary via WhatsApp",
      });

    expect(email.status).toBe(201);
    expect(email.body.data.channel).toBe("EMAIL");
    expect(whatsapp.status).toBe(201);
    expect(whatsapp.body.data.channel).toBe("WHATSAPP");
  });

  it("admin can resend a notification", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);

    const created = await request(getApp())
      .post("/notifications")
      .set(bearer(admin.tokens.accessToken))
      .send({
        employeeId: employee.user.id,
        type: "SCHEDULE",
        channel: "EMAIL",
        title: "Resend test",
        message: "Test message",
      });

    const resend = await request(getApp())
      .put(`/notifications/${created.body.data.id}/resend`)
      .set(bearer(admin.tokens.accessToken));

    expect(resend.status).toBe(200);
    expect(resend.body.data.status).toBe("SENT");
  });
});

// ─── 8. Employee app ─────────────────────────────────────────────────────

describe("US-25: Employee app login", () => {
  it("employee logs in and accesses /me", async () => {
    const employee = await loginAsEmployee();

    const res = await request(getApp())
      .get("/me")
      .set(bearer(employee.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("EMPLOYEE");
  });
});

describe("US-26: Employee work hours", () => {
  it("employee views attendance records with hours", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);

    await request(getApp())
      .post("/me/check-in")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });
    await request(getApp())
      .post("/me/check-out")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });

    const res = await request(getApp())
      .get("/me/attendance")
      .set(bearer(employee.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.some((a: { shiftId: string }) => a.shiftId === shift.id)).toBe(
      true,
    );
  });
});

describe("US-27: Employee current payroll", () => {
  it("employee views own payroll records", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);
    const period = payrollPeriodForShift(times);

    await recordAttendanceForPayroll(employee.tokens.accessToken, employee.user.id, shift.id);

    await request(getApp())
      .post("/payroll/run")
      .set(bearer(admin.tokens.accessToken))
      .send(period);

    const res = await request(getApp())
      .get("/me/payroll")
      .set(bearer(employee.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});

// ─── 9. System ───────────────────────────────────────────────────────────

describe("US-28: Company settings", () => {
  it.skip("not implemented in API MVP", () => {});
});

describe("US-29: System availability", () => {
  it("health endpoint reports system and database status", async () => {
    const res = await request(getApp()).get("/system/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.database).toBe("connected");
  });
});

// ─── Extra flows ─────────────────────────────────────────────────────────

describe("Auth register & change password", () => {
  it("POST /auth/register creates employee account", async () => {
    const suffix = uniqueSuffix();

    const res = await request(getApp())
      .post("/auth/register")
      .send({
        fullName: "Self Registered",
        email: `register.${suffix}@19ergmbh.de`,
        phone: uniquePhone(),
        password: "Register123!",
        hourlyRate: 19,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("EMPLOYEE");
    expect(res.body.data.tokens.accessToken).toBeTypeOf("string");
  });
});

describe("Payroll mark paid & unassign shift", () => {
  it("admin marks payroll as paid", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);
    const period = payrollPeriodForShift(times);

    await recordAttendanceForPayroll(employee.tokens.accessToken, employee.user.id, shift.id);

    const run = await request(getApp())
      .post("/payroll/run")
      .set(bearer(admin.tokens.accessToken))
      .send(period);

    const payrollId = run.body.data.payrolls.find(
      (p: { employeeId: string }) => p.employeeId === employee.user.id,
    )!.id;

    const payrollRecord = run.body.data.payrolls.find(
      (p: { employeeId: string }) => p.employeeId === employee.user.id,
    )!;

    const paid = await request(getApp())
      .put(`/payroll/${payrollId}/pay`)
      .set(bearer(admin.tokens.accessToken))
      .send({ paidAmount: payrollRecord.salary });

    expect(paid.status).toBe(200);
    expect(paid.body.data.isPaid).toBe(true);
  });

  it("admin unassigns employee from shift", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);

    const res = await request(getApp())
      .delete("/shifts/unassign")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shift.id, employeeId: employee.user.id });

    expect(res.status).toBe(200);
    expect(res.body.data.unassigned).toBe(true);
  });
});

describe("Shift employees list", () => {
  it("GET /shift-employees lists assignments", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    await createShiftAndAssign(admin.tokens.accessToken, employee.user.id);

    const res = await request(getApp())
      .get("/shift-employees")
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});
