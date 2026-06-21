import { describe, expect, it } from "vitest";
import request from "supertest";
import { bearer, getApp, loginAsAdmin, loginAsEmployee, SEED } from "./helpers.js";

describe("Auth API", () => {
  it("GET / returns API info", async () => {
    const res = await request(getApp()).get("/");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("19er GmbH API");
  });

  it("POST /auth/login succeeds for seed admin", async () => {
    const res = await request(getApp()).post("/auth/login").send(SEED.admin);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(SEED.admin.email);
    expect(res.body.data.tokens.accessToken).toBeTypeOf("string");
    expect(res.body.data.tokens.refreshToken).toBeTypeOf("string");
  });

  it("POST /auth/login rejects invalid credentials", async () => {
    const res = await request(getApp())
      .post("/auth/login")
      .send({ email: SEED.admin.email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /auth/login validates request body", async () => {
    const res = await request(getApp()).post("/auth/login").send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Validation failed");
  });

  it("POST /auth/refresh rotates tokens", async () => {
    const login = await loginAsAdmin();

    const res = await request(getApp())
      .post("/auth/refresh")
      .send({ refreshToken: login.tokens.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf("string");
    expect(res.body.data.refreshToken).toBeTypeOf("string");
  });

  it("POST /auth/logout revokes refresh token", async () => {
    const login = await loginAsEmployee();

    const logout = await request(getApp())
      .post("/auth/logout")
      .send({ refreshToken: login.tokens.refreshToken });

    expect(logout.status).toBe(200);

    const refresh = await request(getApp())
      .post("/auth/refresh")
      .send({ refreshToken: login.tokens.refreshToken });

    expect(refresh.status).toBe(401);
  });

  it("PUT /auth/change-password requires authentication", async () => {
    const res = await request(getApp())
      .put("/auth/change-password")
      .send({ currentPassword: "x", newPassword: "yyyyyy" });

    expect(res.status).toBe(401);
  });
});

describe("Authorization", () => {
  it("blocks employees from admin user routes", async () => {
    const { tokens } = await loginAsEmployee();

    const res = await request(getApp())
      .get("/admin/users")
      .set(bearer(tokens.accessToken));

    expect(res.status).toBe(403);
  });

  it("rejects requests without a token", async () => {
    const res = await request(getApp()).get("/me");

    expect(res.status).toBe(401);
  });
});
