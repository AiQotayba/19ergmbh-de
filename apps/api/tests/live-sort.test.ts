import request from "supertest";
import { listUsers } from "../src/modules/users/users.service.js";
import { bearer, getApp, SEED } from "./helpers.js";

const base = process.env.API_URL ?? "http://localhost:3002";

describe("Live API sort", () => {
  it("service sort differs asc vs desc", async () => {
    const asc = await listUsers({ sort_field: "fullName", sort_order: "asc", limit: 15 });
    const desc = await listUsers({ sort_field: "fullName", sort_order: "desc", limit: 15 });
    expect(asc.items.map((u) => u.id)).not.toEqual(desc.items.map((u) => u.id));
  });

  it("in-process HTTP sort differs asc vs desc", async () => {
    const login = await request(getApp())
      .post("/auth/login")
      .send({ email: SEED.admin.email, password: SEED.admin.password });
    const auth = bearer(login.body.data.tokens.accessToken);

    const asc = await request(getApp())
      .get("/admin/users")
      .query({ sort_field: "fullName", sort_order: "asc", limit: 15 })
      .set(auth);
    const desc = await request(getApp())
      .get("/admin/users")
      .query({ sort_field: "fullName", sort_order: "desc", limit: 15 })
      .set(auth);

    expect(asc.body.data.items.map((u: { id: string }) => u.id)).not.toEqual(
      desc.body.data.items.map((u: { id: string }) => u.id),
    );
  });

  it("returns different user order for asc vs desc on fullName", async () => {
    const login = await request(base)
      .post("/auth/login")
      .send({ email: SEED.admin.email, password: SEED.admin.password });
    expect(login.status).toBe(200);
    const auth = bearer(login.body.data.tokens.accessToken);

    const asc = await request(base)
      .get("/admin/users")
      .query({ sort_field: "fullName", sort_order: "asc", limit: 15 })
      .set(auth);
    const desc = await request(base)
      .get("/admin/users")
      .query({ sort_field: "fullName", sort_order: "desc", limit: 15 })
      .set(auth);

    expect(asc.status).toBe(200);
    expect(desc.status).toBe(200);

    const ascIds = asc.body.data.items.map((u: { id: string }) => u.id);
    const descIds = desc.body.data.items.map((u: { id: string }) => u.id);
    expect(ascIds).not.toEqual(descIds);
  });
});
