import cron from "node-cron";
import { exec } from "child_process";
import path from "path";

export function startDailyTipJob() {
  const script = path.join(process.cwd(), "backend", "daily_tip.py");

  cron.schedule(
    "0 9 * * *",
    () => {
      console.log("[dailyTip] Running Python script...");
      exec(`python "${script}"`, (err, stdout, stderr) => {
        if (err) {
          console.error("[dailyTip] Failed:", err);
        } else {
          console.log(stdout || "[dailyTip] Done");
          if (stderr) console.error(stderr);
        }
      });
    },
    { timezone: "Asia/Jerusalem" }
  );

  console.log("[dailyTip] Scheduled for 09:00 Asia/Jerusalem");
}
