import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import shiftsRoutes from "./modules/shifts/shifts.routes.js";
import shiftEmployeesRoutes from "./modules/shift-employees/shift-employees.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import payrollRoutes from "./modules/payroll/payroll.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import meRoutes from "./modules/me/me.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import cronRoutes from "./modules/cron/cron.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: false,
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "19er GmbH API",
      version: "0.0.1",
      docs: "/",
    });
  });

  app.use("/auth", authRoutes);
  app.use("/admin/users", usersRoutes);
  app.use("/shifts", shiftsRoutes);
  app.use("/shift-employees", shiftEmployeesRoutes);
  app.use("/attendance", attendanceRoutes);
  app.use("/payroll", payrollRoutes);
  app.use("/notifications", notificationsRoutes);
  app.use("/me", meRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/system", dashboardRoutes);
  app.use("/cron", cronRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
