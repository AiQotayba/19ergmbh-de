import { describe, expect, it } from "vitest";
import request from "supertest";
import { bearer, createTestEmployee, futureShiftTimes, getApp, loginAsAdmin, loginAsEmployee } from "./helpers.js";

describe("Me API", () => {
  it("GET /me returns employee profile", async () => {
    const { tokens, user } = await loginAsEmployee();

    const res = await request(getApp()).get("/me").set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.email).toBe(user.email);
  });

  it("GET /me/shifts returns assigned shifts", async () => {
    const { tokens } = await loginAsEmployee();

    const res = await request(getApp()).get("/me/shifts").set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("GET /me/payroll returns payroll list", async () => {
    const { tokens } = await loginAsEmployee();

    const res = await request(getApp()).get("/me/payroll").set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});

describe("Dashboard API", () => {
  it("GET /system/health is public", async () => {
    const res = await request(getApp()).get("/system/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("GET /dashboard/stats requires admin", async () => {
    const { tokens } = await loginAsAdmin();

    const res = await request(getApp())
      .get("/dashboard/stats")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /dashboard/stats rejects employees", async () => {
    const { tokens } = await loginAsEmployee();

    const res = await request(getApp())
      .get("/dashboard/stats")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(403);
  });
});

describe("Attendance API", () => {
  it("employee can check in and out of an assigned shift", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const times = futureShiftTimes(24);

    const shift = await request(getApp())
      .post("/shifts")
      .set(bearer(admin.tokens.accessToken))
      .send({ title: "Attendance Test Shift", ...times });

    expect(shift.status).toBe(201);

    const assign = await request(getApp())
      .post("/shifts/assign")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shift.body.data.id, employeeId: employee.user.id });

    expect(assign.status).toBe(201);

    const checkIn = await request(getApp())
      .post("/attendance/check-in")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.body.data.id });

    expect(checkIn.status).toBe(201);
    expect(checkIn.body.data.checkIn).toBeTruthy();

    const checkOut = await request(getApp())
      .post("/attendance/check-out")
      .set(bearer(employee.tokens.accessToken))
      .send({ shiftId: shift.body.data.id });

    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.checkOut).toBeTruthy();
  });
});

describe("Notifications API", () => {
  it("GET /notifications returns list for employee", async () => {
    const { tokens } = await loginAsEmployee();

    const res = await request(getApp())
      .get("/notifications")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});

describe("Payroll API", () => {
  it("GET /payroll/runs lists runs for admin", async () => {
    const { tokens } = await loginAsAdmin();

    const res = await request(getApp())
      .get("/payroll/runs")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
