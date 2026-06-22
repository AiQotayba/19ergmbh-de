import "./config/env.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startNotificationCron } from "./jobs/notification-cron.js";

const app = createApp();

startNotificationCron();

app.listen(env.port, () => {
  console.log(`19er GmbH API running on http://localhost:${env.port}`);
});
