const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

/** @type {import("pm2").StartOptions} */
module.exports = {
  apps: [
    {
      name: "19er-api",
      cwd: repoRoot,
      script: path.join(repoRoot, "apps/api/dist/server.js"),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: path.join(repoRoot, "logs/api-error.log"),
      out_file: path.join(repoRoot, "logs/api-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
