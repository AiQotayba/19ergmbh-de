import { prisma } from "@19er/db";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bearer,
  createTestEmployee,
  createShiftAndAssign,
  getApp,
  loginAsAdmin,
} from "./helpers";

const sendEmailMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true as const }),
);

vi.mock("../src/services/email/email.service.js", () => ({
  isEmailConfigured: () => true,
  sendEmail: (input: unknown) => sendEmailMock(input),
}));

import { dispatchNotification } from "../src/services/notifications/notification-dispatch.js";
import { genericNotificationEmail } from "../src/services/email/templates.js";

describe("Email sending", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
    sendEmailMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    sendEmailMock.mockReset();
  });

  it("dispatchNotification sends EMAIL to the employee address", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);

    const notification = await prisma.notification.create({
      data: {
        employeeId: employee.user.id,
        type: "SCHEDULE",
        channel: "EMAIL",
        status: "PENDING",
        title: "Neue Schicht – Test",
        message: "Hallo Test,\n\nIhre Schicht beginnt morgen.\n\n19er GmbH",
        scheduledAt: new Date(),
      },
    });

    await dispatchNotification(notification.id);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: employee.user.email,
        subject: expect.stringContaining("Neue Schicht"),
        text: expect.any(String),
        html: expect.stringContaining("19er GmbH"),
      }),
    );

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe("SENT");
    expect(updated?.sentAt).toBeTruthy();
  });

  it("marks notification FAILED when email send returns an error", async () => {
    sendEmailMock.mockResolvedValueOnce({ ok: false, skipped: false, error: "SMTP rejected" });

    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);

    const notification = await prisma.notification.create({
      data: {
        employeeId: employee.user.id,
        type: "SALARY",
        channel: "EMAIL",
        status: "PENDING",
        title: "Gehaltsabrechnung",
        message: "Test payroll email",
        scheduledAt: new Date(),
      },
    });

    await dispatchNotification(notification.id);

    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated?.status).toBe("PENDING");
    expect(updated?.lastError).toBe("SMTP rejected");
    expect(updated?.attempts).toBe(1);
  });

  it("send-schedule API dispatches EMAIL notifications", async () => {
    const admin = await loginAsAdmin();
    const employee = await createTestEmployee(admin.tokens.accessToken);
    const { shift } = await createShiftAndAssign(
      admin.tokens.accessToken,
      employee.user.id,
      "Email Schedule Shift",
    );

    const res = await request(getApp())
      .post("/notifications/send-schedule")
      .set(bearer(admin.tokens.accessToken))
      .send({ shiftId: shift.id, channel: "EMAIL" });

    expect(res.status).toBe(201);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].channel).toBe("EMAIL");
    expect(res.body.data[0].status).toBe("SENT");

    expect(sendEmailMock).toHaveBeenCalled();
    const payload = sendEmailMock.mock.calls.find(
      (call) => (call[0] as { to: string }).to === employee.user.email,
    );
    expect(payload).toBeDefined();
    expect((payload![0] as { html: string }).html).toContain("19er GmbH");
  });

  it("genericNotificationEmail builds subject and html body", () => {
    const tpl = genericNotificationEmail("Test Title", "Line one\nLine two");
    expect(tpl.subject).toBe("Test Title");
    expect(tpl.html).toContain("Test Title");
    expect(tpl.html).toContain("Line one");
    expect(tpl.text).toContain("Line two");
  });
});
