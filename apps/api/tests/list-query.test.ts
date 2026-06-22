import request from "supertest";
import {
  bearer,
  createShiftAndAssign,
  createTestEmployee,
  futureShiftSchedule,
  getApp,
  loginAsAdmin,
  uniqueSuffix,
} from "./helpers.js";
import { expect } from "vitest";
import { it, describe } from "vitest";

describe("List query: users sort & filters", () => {
  it("sorts users by name ascending (sort_field alias)", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Zeta User ${suffix}`,
        email: `zeta.${suffix}@19ergmbh.de`,
        phone: `+4915${suffix.replace(/\D/g, "").slice(0, 9)}1`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 10,
      });

    await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Alpha User ${suffix}`,
        email: `alpha.${suffix}@19ergmbh.de`,
        phone: `+4915${suffix.replace(/\D/g, "").slice(0, 9)}2`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 12,
      });

    const res = await request(getApp())
      .get("/admin/users")
      .query({ search: suffix, sort_field: "name", sort_order: "asc", limit: 50 })
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    const names = res.body.data.items
      .filter((u: { fullName: string }) => u.fullName.includes(suffix))
      .map((u: { fullName: string }) => u.fullName);
    expect(names[0]).toContain("Alpha");
  });

  it("applies different order for asc vs desc on fullName", async () => {
    const { tokens } = await loginAsAdmin();
    const auth = bearer(tokens.accessToken);

    const asc = await request(getApp())
      .get("/admin/users")
      .query({ sort_field: "fullName", sort_order: "asc", limit: 15 })
      .set(auth);
    const desc = await request(getApp())
      .get("/admin/users")
      .query({ sort_field: "fullName", sort_order: "desc", limit: 15 })
      .set(auth);

    expect(asc.status).toBe(200);
    expect(desc.status).toBe(200);

    const ascIds = asc.body.data.items.map((u: { id: string }) => u.id);
    const descIds = desc.body.data.items.map((u: { id: string }) => u.id);
    expect(ascIds).not.toEqual(descIds);
  });

  it("sorts users by email and hourlyRate", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Email Sort A ${suffix}`,
        email: `z.${suffix}@19ergmbh.de`,
        phone: `+4917${suffix.replace(/\D/g, "").slice(0, 9)}1`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 30,
      });

    await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Email Sort B ${suffix}`,
        email: `a.${suffix}@19ergmbh.de`,
        phone: `+4917${suffix.replace(/\D/g, "").slice(0, 9)}2`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 10,
      });

    const byEmail = await request(getApp())
      .get("/admin/users")
      .query({ search: suffix, sort_field: "email", sort_order: "asc", limit: 50 })
      .set(bearer(tokens.accessToken));

    expect(byEmail.status).toBe(200);
    expect(byEmail.body.data.items[0].email).toContain(`a.${suffix}`);

    const byRate = await request(getApp())
      .get("/admin/users")
      .query({ search: suffix, sort_field: "hourlyRate", sort_order: "desc", limit: 50 })
      .set(bearer(tokens.accessToken));

    expect(byRate.status).toBe(200);
    expect(byRate.body.data.items[0].hourlyRate).toBe(30);
  });

  it("sorts users by role", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Role Sort ${suffix}`,
        email: `employee.${suffix}@19ergmbh.de`,
        phone: `+4918${suffix.replace(/\D/g, "").slice(0, 9)}`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 20,
      });

    const res = await request(getApp())
      .get("/admin/users")
      .query({ search: suffix, sort_field: "role", sort_order: "asc", limit: 50 })
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it("filters users by isActive", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    const inactive = await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Inactive ${suffix}`,
        email: `inactive.${suffix}@19ergmbh.de`,
        phone: `+4916${suffix.replace(/\D/g, "").slice(0, 9)}`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 10,
        isActive: false,
      });

    const active = await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: `Active ${suffix}`,
        email: `active.${suffix}@19ergmbh.de`,
        phone: `+4917${suffix.replace(/\D/g, "").slice(0, 9)}`,
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 12,
        isActive: true,
      });

    const inactiveRes = await request(getApp())
      .get("/admin/users")
      .query({ isActive: "false", search: suffix })
      .set(bearer(tokens.accessToken));

    expect(inactiveRes.status).toBe(200);
    expect(inactiveRes.body.data.items.some((u: { id: string }) => u.id === inactive.body.data.id)).toBe(true);
    expect(inactiveRes.body.data.items.every((u: { isActive: boolean }) => !u.isActive)).toBe(true);
    expect(inactiveRes.body.data.items.some((u: { id: string }) => u.id === active.body.data.id)).toBe(false);

    const activeRes = await request(getApp())
      .get("/admin/users")
      .query({ isActive: "true", search: suffix })
      .set(bearer(tokens.accessToken));

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.items.some((u: { id: string }) => u.id === active.body.data.id)).toBe(true);
    expect(activeRes.body.data.items.every((u: { isActive: boolean }) => u.isActive)).toBe(true);
  });

  it("sorts users by isActive", async () => {
    const { tokens } = await loginAsAdmin();

    const res = await request(getApp())
      .get("/admin/users")
      .query({ sort_field: "isActive", sort_order: "desc", limit: 5 })
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});

describe("List query: shifts sort & filters", () => {
  it("filters shifts by employee and date range", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      `Filter Shift ${uniqueSuffix()}`,
    );

    const fromDate = times.fromDate;
    const toDate = times.toDate;

    const byParams = await request(getApp())
      .get("/shifts")
      .query({ employeeId: employee.user.id, fromDate, toDate })
      .set(bearer(admin.tokens.accessToken));

    expect(byParams.status).toBe(200);
    expect(byParams.body.data.items.some((s: { id: string }) => s.id === shift.id)).toBe(true);

    const byRange = await request(getApp())
      .get("/shifts")
      .query({ employeeId: employee.user.id, dateRange: `${fromDate},${toDate}` })
      .set(bearer(admin.tokens.accessToken));

    expect(byRange.status).toBe(200);
    expect(byRange.body.data.items.some((s: { id: string }) => s.id === shift.id)).toBe(true);
  });

  it("sorts shifts by start/end aliases and title", async () => {
    const { tokens } = await loginAsAdmin();

    const byStart = await request(getApp())
      .get("/shifts")
      .query({ sort_field: "start", sort_order: "desc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byStart.status).toBe(200);
    const startTimes = byStart.body.data.items.map((s: { fromDate: string }) =>
      new Date(s.fromDate).getTime(),
    );
    expect(startTimes).toEqual([...startTimes].sort((a, b) => b - a));

    const byEnd = await request(getApp())
      .get("/shifts")
      .query({ sort_field: "end", sort_order: "asc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byEnd.status).toBe(200);
    const endTimes = byEnd.body.data.items.map((s: { toDate: string }) =>
      new Date(s.toDate).getTime(),
    );
    expect(endTimes).toEqual([...endTimes].sort((a, b) => a - b));

    const byTitle = await request(getApp())
      .get("/shifts")
      .query({ sort_field: "title", sort_order: "asc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byTitle.status).toBe(200);
    expect(byTitle.body.data.items.length).toBeGreaterThan(0);
  });

  it("searches shifts by title", async () => {
    const admin = await loginAsAdmin();
    const title = `Searchable Shift ${uniqueSuffix()}`;
    await createShiftAndAssign(admin.tokens.accessToken, (await createTestEmployee(admin.tokens.accessToken)).user.id, title);

    const res = await request(getApp())
      .get("/shifts")
      .query({ search: title })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.some((s: { title: string | null }) => s.title === title)).toBe(true);
  });

  it("lists shift candidates with existing shifts on selected day", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      `Candidate Shift ${uniqueSuffix()}`,
    );

    const fromDate = times.fromDate;

    const res = await request(getApp())
      .get("/shifts/candidates")
      .query({ fromDate, toDate: fromDate, search: employee.user.fullName.split(" ").pop() })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    const match = res.body.data.items.find((u: { id: string }) => u.id === employee.user.id);
    expect(match).toBeTruthy();
    expect(match.shifts.some((s: { id: string }) => s.id === shift.id)).toBe(true);
  });

  it("creates shift with multiple employees in one request", async () => {
    const admin = await loginAsAdmin();
    const first = await createTestEmployee(admin.tokens.accessToken);
    const second = await createTestEmployee(admin.tokens.accessToken);
    const schedule = futureShiftSchedule(0);
    schedule.fromDate = new Date(Date.now() + 72 * 3_600_000).toISOString().slice(0, 10);
    schedule.toDate = schedule.fromDate;

    const res = await request(getApp())
      .post("/shifts")
      .set(bearer(admin.tokens.accessToken))
      .send({
        title: `US-7 Multi ${uniqueSuffix()}`,
        ...schedule,
        employeeIds: [first.user.id, second.user.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.employees).toHaveLength(2);
  });

  it("creates one ranged shift via POST /shifts/bulk", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const suffix = uniqueSuffix();
    const fromDate = "2030-06-01";
    const toDate = "2030-06-03";

    const res = await request(getApp())
      .post("/shifts/bulk")
      .set(bearer(admin.tokens.accessToken))
      .send({
        title: `Bulk Shift ${suffix}`,
        fromDate,
        toDate,
        dailyStartTime: "09:00",
        dailyEndTime: "17:00",
        employeeIds: [employee.user.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.item.fromDate.slice(0, 10)).toBe(fromDate);
    expect(res.body.data.item.toDate.slice(0, 10)).toBe(toDate);

    const list = await request(getApp())
      .get("/shifts")
      .query({ search: `Bulk Shift ${suffix}` })
      .set(bearer(admin.tokens.accessToken));

    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
  });

  it("deletes shift that has attendance records", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      `Deletable Shift ${uniqueSuffix()}`,
    );

    const checkIn = await request(getApp())
      .post("/attendance/check-in")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });

    expect(checkIn.status).toBe(201);

    const del = await request(getApp())
      .delete(`/shifts/${shift.id}`)
      .set(bearer(admin.tokens.accessToken));

    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    const gone = await request(getApp())
      .get(`/shifts/${shift.id}`)
      .set(bearer(admin.tokens.accessToken));

    expect(gone.status).toBe(404);
  });
});

describe("List query: attendance sort & filters", () => {
  it("filters attendance by employee and status", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      `Attendance Filter ${uniqueSuffix()}`,
    );

    await request(getApp())
      .post("/attendance/check-in")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });

    const res = await request(getApp())
      .get("/attendance")
      .query({ employeeId: employee.user.id, status: "PRESENT" })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(
      res.body.data.items.every(
        (a: { employeeId: string; status: string }) =>
          a.employeeId === employee.user.id && a.status === "PRESENT",
      ),
    ).toBe(true);
  });

  it("sorts attendance by employee, date, and checkin/checkout aliases", async () => {
    const { tokens } = await loginAsAdmin();

    const byEmployee = await request(getApp())
      .get("/attendance")
      .query({ sort_field: "employee", sort_order: "asc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byEmployee.status).toBe(200);
    expect(byEmployee.body.data.items.length).toBeGreaterThan(0);

    const byDate = await request(getApp())
      .get("/attendance")
      .query({ sort_field: "date", sort_order: "desc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byDate.status).toBe(200);
    const dates = byDate.body.data.items.map((a: { shift: { startTime: string } }) =>
      new Date(a.shift.startTime).getTime(),
    );
    expect(dates).toEqual([...dates].sort((a, b) => b - a));

    const byCheckin = await request(getApp())
      .get("/attendance")
      .query({ sort_field: "checkin", sort_order: "asc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byCheckin.status).toBe(200);
    const withCheckIn = byCheckin.body.data.items.filter((a: { checkIn: string | null }) => a.checkIn);
    const times = withCheckIn.map((a: { checkIn: string }) => new Date(a.checkIn).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));

    const byCheckout = await request(getApp())
      .get("/attendance")
      .query({ sort_field: "checkout", sort_order: "desc", limit: 20 })
      .set(bearer(tokens.accessToken));

    expect(byCheckout.status).toBe(200);
  });

  it("filters attendance by date range and employee", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift, times } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      `Attendance Date ${uniqueSuffix()}`,
    );

    await request(getApp())
      .post("/attendance/check-in")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.id });

    const fromDate = times.fromDate;
    const toDate = times.toDate;

    const res = await request(getApp())
      .get("/attendance")
      .query({ employeeId: employee.user.id, fromDate, toDate })
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.some((a: { shiftId: string }) => a.shiftId === shift.id)).toBe(true);

    const byRange = await request(getApp())
      .get("/attendance")
      .query({ employeeId: employee.user.id, dateRange: `${fromDate},${toDate}` })
      .set(bearer(admin.tokens.accessToken));

    expect(byRange.status).toBe(200);
    expect(byRange.body.data.items.some((a: { shiftId: string }) => a.shiftId === shift.id)).toBe(true);
  });
});
