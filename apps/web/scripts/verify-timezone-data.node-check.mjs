import assert from "node:assert/strict";
import { test } from "node:test";
import { timezoneCases, verifyTimezoneData } from "./verify-timezone-data.mjs";

test("the installed runtime handles Morocco's transition and regular DST", () => {
  assert.doesNotThrow(() => verifyTimezoneData());
});

test("stale timezone data is rejected instead of shifting booking timestamps", () => {
  assert.throws(
    () => verifyTimezoneData(() => "11:00"),
    /Outdated timezone data: Africa\/Casablanca.*Update the Node runtime/s
  );
});

test("all transition canaries are checked", () => {
  const visited = [];
  verifyTimezoneData((timeZone, instant) => {
    visited.push([timeZone, instant]);
    return timezoneCases.find(([zone, date]) => zone === timeZone && date === instant)[2];
  });
  assert.equal(visited.length, timezoneCases.length);
});
