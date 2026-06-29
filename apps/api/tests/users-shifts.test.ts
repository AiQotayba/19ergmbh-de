import { describe, expect, it } from "vitest";
import request from "supertest";
import { bearer, createTestEmployee, futureShiftTimes, getApp, loginAsAdmin, loginAsEmployee, overlappingShiftPair, uniquePhone, uniqueSuffix } from "./helpers.js";

describe("Users API", () => {
  it("GET /admin/users lists users for admin", async () => {
    const { tokens } = await loginAsAdmin();

    const res = await request(getApp())
      .get("/admin/users")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it("POST /admin/users creates an employee", async () => {
    const { tokens } = await loginAsAdmin();
    const suffix = uniqueSuffix();

    const res = await request(getApp())
      .post("/admin/users")
      .set(bearer(tokens.accessToken))
      .send({
        fullName: "Test Employee",
        email: `test.${suffix}@19ergmbh.de`,
        phone: uniquePhone(),
        password: "Test123!",
        role: "EMPLOYEE",
        hourlyRate: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toContain("test.");
    expect(res.body.data.role).toBe("EMPLOYEE");
  });

  it("GET /admin/users/:id returns a single user", async () => {
    const admin = await loginAsAdmin();
    const list = await request(getApp())
      .get("/admin/users")
      .set(bearer(admin.tokens.accessToken));

    const userId = list.body.data.items[0].id;

    const res = await request(getApp())
      .get(`/admin/users/${userId}`)
      .set(bearer(admin.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(userId);
  });
});

describe("Shifts API", () => {
  it("GET /shifts returns shifts for authenticated users", async () => {
    const { tokens } = await loginAsEmployee();

    const res = await request(getApp()).get("/shifts").set(bearer(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("POST /shifts creates a shift as admin", async () => {
    const { tokens } = await loginAsAdmin();
    const times = futureShiftTimes(48);

    const res = await request(getApp())
      .post("/shifts")
      .set(bearer(tokens.accessToken))
      .send({
        title: "API Test Shift",
        ...times,
        breakMinutes: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("API Test Shift");
  });

  it("POST /shifts/assign rejects overlapping shift for same employee", async () => {
    const admin = await loginAsAdmin();
    const employee = await loginAsEmployee();
    const employeeId = employee.user.id;
    const { shiftA: times, shiftB } = overlappingShiftPair(72);

    const shiftA = await request(getApp())
      .post("/shifts")
      .set(bearer(admin.tokens.accessToken))
      .send({ title: "Shift A", ...times });

    const shiftBRes = await request(getApp())
      .post("/shifts")
      .set(bearer(admin.tokens.accessToken))
      .send({
        title: "Shift B",
        ...shiftB,
      });

    await request(getApp())
      .post("/shifts/assign")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shiftA.body.data.id, employeeId });

    const conflict = await request(getApp())
      .post("/shifts/assign")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shiftBRes.body.data.id, employeeId });

    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe("shift.overlapping_assignment");
  });
});
