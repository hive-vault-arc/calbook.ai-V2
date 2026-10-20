import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// IANA tzdb's September 2026 Morocco transition must agree with current browsers.
const timezoneCases = [
  ["Africa/Casablanca", "2026-09-19T10:00:00Z", "11:00"],
  ["Africa/Casablanca", "2026-09-20T00:59:59Z", "01:59"],
  ["Africa/Casablanca", "2026-09-20T01:00:00Z", "01:00"],
  ["Africa/Casablanca", "2026-10-20T10:00:00Z", "10:00"],
  ["Africa/El_Aaiun", "2026-10-20T10:00:00Z", "10:00"],
  ["America/New_York", "2026-01-20T10:00:00Z", "05:00"],
  ["America/New_York", "2026-07-20T10:00:00Z", "06:00"],
];

function formatTime(timeZone, instant) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

function verifyTimezoneData(format = formatTime) {
  for (const [timeZone, instant, expected] of timezoneCases) {
    const actual = format(timeZone, instant);
    if (actual !== expected) {
      throw new Error(
        `Outdated timezone data: ${timeZone} at ${instant} expected ${expected}, received ${actual}. ` +
          `Node ${process.version}, tzdb ${process.versions.tz ?? "unknown"}. Update the Node runtime; do not adjust booking timestamps.`
      );
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  verifyTimezoneData();
  console.info(`Timezone checks passed: Node ${process.version}, tzdb ${process.versions.tz ?? "unknown"}`);
}

export { timezoneCases, verifyTimezoneData };
