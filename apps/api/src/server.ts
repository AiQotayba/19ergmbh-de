import app from "./create-server-app.js";
import { env } from "./config/env.js";
import { startNotificationCron } from "./jobs/notification-cron.js";

if (!process.env.VERCEL) {
  startNotificationCron();

  app.listen(env.port, () => {
    console.log(`19er GmbH API running on http://localhost:${env.port}`);
  });
}
